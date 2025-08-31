const express = require("express");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const path = require("path");
const request = require("request");
const axios = require("axios");

const app = express();
app.use(fileUpload());
app.use(express.json());

// === PORT & TOKEN ===
const PORT = 7001;
const api = "ghp_";
const apii = "gEk4EidNjjyNeAdNUCfe9xUZv1PLXdl1ln1d4";

// === Konfigurasi GitHub ===
const GITHUB_TOKEN = `${api}${apii}`;
const REPO_OWNER = "LyncxTeams";
const REPO_NAME = "cdn_upload";
const BRANCH = "main";

// ====== Database Sederhana ======
const db = {
  storage: {},
  set: (key, value) => {
    db.storage[key] = value;
  },
};

// ====== Helper ======
function generateRandomFileName(length) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
  return (bytes / 1073741824).toFixed(2) + " GB";
}

function cleanFileName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

function sendResponse(res, status, success, message, data = null, error = null) {
  res.status(status).json({
    creator: "FuadXyro",
    status: success,
    message,
    data,
    error,
  });
}

// ====== Upload ke GitHub ======
app.post("/api/upload", async (req, res) => {
  if (!req.files || !req.files.file)
    return sendResponse(res, 400, false, "No file uploaded.");

  const file = req.files.file;
  const fileExtension = file.name.split(".").pop();
  const fileName = generateRandomFileName(8) + "." + fileExtension;
  const base64Content = file.data.toString("base64");

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/Image/${fileName}`;
  try {
    const response = await axios.put(
      url,
      { message: `Upload ${fileName}`, content: base64Content, branch: BRANCH },
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
    );

    sendResponse(res, 200, true, "File uploaded successfully to GitHub", {
      raw_url: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/Image/${fileName}`,
      github_url: response.data.content.html_url,
    });
  } catch (err) {
    sendResponse(res, 500, false, "Error uploading to GitHub", null, err.response?.data || err.message);
  }
});

// ====== Start Server ======
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
