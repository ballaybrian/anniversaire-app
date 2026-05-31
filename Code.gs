// ===================== CONFIG =====================
// Dossier Drive où seront UPLOAD les photos prises via l'app
const DRIVE_UPLOAD_FOLDER_ID = "1JxXsZYxizwzUW3rNmEJ5cfBBIQTKKxBl";

// Code admin (reset bouchons)
const ADMIN_RESET_CODE = "1234"; // change ici

// Nombre de bouchons à trouver
const BOUCHONS_GOAL = 326;

// ===================== HELPERS =====================
function jsonOut(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function allowCors(out){
  return out.setHeader("Access-Control-Allow-Origin", "*");
}

// ===================== WEB APP =====================
function doGet(e){
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

  if(action === "album_list"){
    const folderId = String(e.parameter.folderId || "");
    if(!folderId) return allowCors(jsonOut({ ok:false, message:"folderId manquant" }));

    try{
      const folder = DriveApp.getFolderById(folderId);
      const files = folder.getFiles();
      const items = [];

      while(files.hasNext()){
        const f = files.next();
        const id = f.getId();
        items.push({
          id: id,
          name: f.getName(),
          thumbUrl: "https://drive.google.com/thumbnail?id=" + id + "&sz=w600",
          fullUrl:  "https://drive.google.com/thumbnail?id=" + id + "&sz=w2000",
          viewUrl:  "https://drive.google.com/file/d/" + id + "/view"
        });
      }

      return allowCors(jsonOut({ ok:true, items: items }));
    }catch(err){
      return allowCors(jsonOut({ ok:false, message:"Erreur Drive: " + err }));
    }
  }

  if(action === "bouchons_state"){
    const p = PropertiesService.getScriptProperties();
    const locked = p.getProperty("bouchons_locked") === "1";
    return allowCors(jsonOut({ ok:true, locked: locked }));
  }

  if(action === "bouchons_reset"){
    const code = String(e.parameter.code || "");
    if(code !== ADMIN_RESET_CODE){
      return allowCors(jsonOut({ ok:false, message:"Code incorrect" }));
    }
    const p = PropertiesService.getScriptProperties();
    p.deleteProperty("bouchons_locked");
    p.deleteProperty("bouchons_winner_guess");
    p.deleteProperty("bouchons_winner_at");
    return allowCors(jsonOut({ ok:true, message:"Reset OK" }));
  }

  return allowCors(jsonOut({ ok:true, message:"BirthdayUploader is running" }));
}

function doPost(e){
  const raw = e.postData && e.postData.contents ? e.postData.contents : "";
  let data = {};
  try { data = JSON.parse(raw); } catch(err){}

  if(data && data.dataUrl){
    try{
      const root = DriveApp.getFolderById(DRIVE_UPLOAD_FOLDER_ID);
      const tableId = String(data.tableId || "");
      const type = String(data.type || "");
      let targetFolder = root;

      if(type === "binomes"){
        const folderName = "Jeux_des_binomes";
        const folders = root.getFoldersByName(folderName);
        targetFolder = folders.hasNext() ? folders.next() : root.createFolder(folderName);
      } else if(tableId){
        const folderName = "Table_" + tableId;
        const folders = root.getFoldersByName(folderName);
        targetFolder = folders.hasNext() ? folders.next() : root.createFolder(folderName);
      }

      const dataUrl = String(data.dataUrl);
      const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if(!match){
        return allowCors(jsonOut({ ok:false, message:"dataUrl invalide" }));
      }

      const contentType = match[1];
      const base64Data = match[2];
      const bytes = Utilities.base64Decode(base64Data);
      const filename = data.filename || ("photo_" + Date.now() + ".jpg");

      const blob = Utilities.newBlob(bytes, contentType, filename);
      targetFolder.createFile(blob);

      return allowCors(jsonOut({ ok:true, message:"Upload OK" }));
    }catch(err){
      return allowCors(jsonOut({ ok:false, message:"Erreur upload: " + err }));
    }
  }

  if(data && data.action === "bouchons_guess"){
    const guess = Number(data.guess);
    if(!Number.isFinite(guess)){
      return allowCors(jsonOut({ ok:false, message:"Guess invalide" }));
    }

    const p = PropertiesService.getScriptProperties();
    const locked = p.getProperty("bouchons_locked") === "1";
    if(locked){
      return allowCors(jsonOut({ ok:true, locked:true, message:"Jeu terminé" }));
    }

    const diff = Math.abs(BOUCHONS_GOAL - guess);
    const tooLow = guess < BOUCHONS_GOAL;
    const tooHigh = guess > BOUCHONS_GOAL;

    if(diff === 0){
      p.setProperty("bouchons_locked", "1");
      p.setProperty("bouchons_winner_guess", String(guess));
      p.setProperty("bouchons_winner_at", new Date().toISOString());
      return allowCors(jsonOut({ ok:true, locked:true, diff:0, message:"Trouvé !" }));
    }

    return allowCors(jsonOut({
      ok:true,
      locked:false,
      diff: diff,
      tooLow: tooLow,
      tooHigh: tooHigh,
      message: "Essaye encore"
    }));
  }

  return allowCors(jsonOut({ ok:true, message:"OK" }));
}
