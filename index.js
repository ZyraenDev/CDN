const express = require("express");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const favicon = require("serve-favicon");
const JSONdb = require("simple-json-db");
const fs = require("fs");
const path = require("path");
const request = require("request");
const cfonts = require("cfonts");
const axios = require("axios");

const db = new JSONdb("./db/db.json");
const app = express();
const PORT = 7001;
const = api = "ghp_"
const = apii = "gEk4EidNjjyNeAdNUCfe9xUZv1PLXdl1ln1d4"
// === Konfigurasi GitHub ===
const GITHUB_TOKEN = `${api}${apii}`;
const REPO_OWNER = "LyncxTeams";
const REPO_NAME = "cdn_upload";
const BRANCH = "main";

// Middleware
app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(favicon(path.join(__dirname, "assets", "img", "favicon.ico")));

// === Helper Functions ===
function generateRandomFileName(length) {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}

function cleanFileName(originalName) {
  const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, "");
  return nameWithoutExtension;
}

function formatFileSize(size) {
  if (size > 1000000) {
    return `${(size / 1000000).toFixed(2)} MB`;
  } else if (size > 1000) {
    return `${(size / 1000).toFixed(2)} KB`;
  } else {
    return `${size} Bytes`;
  }
}

// === Routes ===
app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/docs", (req, res) => {
  res.render("docs.ejs");
});

// ===== Upload ke folder lokal (lama) =====
app.post("/upload", (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send("No file uploaded.");
  }
  const file = req.files.file;
  const originalName = file.name;
  const fileExtension = originalName.split(".").pop();
  let nameWithoutExtension = generateRandomFileName(8);
  let name = nameWithoutExtension + "." + fileExtension;
  const type = file.mimetype;
  const size = file.size;

  if (size > 300000000) {
    return res.send("Sorry, that file is too large.");
  }

  let number = 0;
  while (Object.keys(db.storage).includes(name)) {
    number += 1;
    name = `${nameWithoutExtension}-${number}.${fileExtension}`;
  }

  db.set(name, {
    name: name,
    type: type,
    size: formatFileSize(size),
  });
  file.mv("./file/" + name);
  res.redirect("/data/" + name);
});

// ===== Upload ke lokal API (lama) =====
app.post("/api/uplod", (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send("No file uploaded.");
  }

  const file = req.files.file;
  const originalName = file.name;
  const fileExtension = originalName.split(".").pop();
  const cleanedName = cleanFileName(originalName);
  let name = cleanedName + "." + fileExtension;
  const type = file.mimetype;
  const size = file.size;

  if (size > 300000000) {
    return res.status(400).json({ message: "Sorry, that file is too large." });
  }

  let number = 0;
  while (db.storage[name]) {
    number += 1;
    name = `${cleanedName}-${number}.${fileExtension}`;
  }

  db.storage[name] = {
    name: name,
    type: type,
    size: formatFileSize(size),
  };
  file.mv("./file/" + name, (err) => {
    if (err) {
      return res.status(500).json({ message: "Error uploading file." });
    }

    const jsonResponse = {
      creator: "FuadXyro",
      status: true,
      message: "File uploaded successfully",
      data: {
        url: `https://${req.get("host")}/${name}`,
        type: type,
        size: formatFileSize(size),
      },
    };

    res.set("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(jsonResponse, null, 2));
  });
});

// ===== Upload dari URL (lama) =====
app.get("/api/upload/to", (req, res) => {
  const url = req.query.url;
  const namefile = req.query.namefile;

  if (!url) {
    return res.status(400).send("URL not provided.");
  }
  if (!namefile) {
    return res.status(400).send("Filename not provided.");
  }

  const cleanedName = cleanFileName(namefile);

  request
    .get(url)
    .on("response", function (response) {
      if (response.statusCode !== 200) {
        return res
          .status(400)
          .send("Failed to download the file from the provided URL.");
      }

      const contentType = response.headers["content-type"];
      const fileExtension = contentType.split("/")[1];
      let name = `${cleanedName}.${fileExtension}`;
      const filePath = path.join(__dirname, "file", name);

      response.pipe(fs.createWriteStream(filePath));

      response.on("end", () => {
        const size = fs.statSync(filePath).size;

        if (size > 300000000) {
          fs.unlinkSync(filePath);
          return res.send("Sorry, the downloaded file is too large.");
        } else {
          let number = 0;
          while (db.storage.hasOwnProperty(name)) {
            number += 1;
            name = `${cleanedName}-${number}.${fileExtension}`;
          }

          db.set(name, {
            name: name,
            type: contentType,
            size: formatFileSize(size),
          });

          const jsonResponse = {
            creator: "FuadXyro",
            status: true,
            message: "File uploaded successfully",
            data: {
              url: `https://${req.get("host")}/${name}`,
              type: contentType,
              size: formatFileSize(size),
            },
          };

          res.set("Content-Type", "application/json");
          res.status(200).send(JSON.stringify(jsonResponse, null, 2));
        }
      });
    })
    .on("error", (err) => {
      res.status(500).send("Error downloading the file.");
    });
});

// ===== Upload ke GitHub =====
app.post("/api/upload", async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send("No file uploaded.");
  }

  const file = req.files.file;
  const fileExtension = file.name.split(".").pop();
  const fileName = generateRandomFileName(8) + "." + fileExtension;
  const base64Content = file.data.toString("base64");

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/Image/${fileName}`;
  try {
    const response = await axios.put(
      url,
      {
        message: `Upload ${fileName}`,
        content: base64Content,
        branch: BRANCH,
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    const jsonResponse = {
      creator: "FuadXyro",
      status: true,
      message: "File uploaded successfully to GitHub",
      data: {
        url: `https://${req.get("host")}/${fileName}`, // otomatis pakai domain server kamu
        github_url: response.data.content.html_url, // url github repo
      },
    };

    res.set("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(jsonResponse, null, 2));
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error uploading to GitHub.");
  }
});

// ===== Route ambil file dari GitHub (proxy) =====
app.get("/:filename", async (req, res) => {
  const filename = req.params.filename;
  const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/Image/${filename}`;
  try {
    const response = await axios.get(rawUrl, { responseType: "arraybuffer" });
    res.set("Content-Type", response.headers["content-type"] || "application/octet-stream");
    res.send(response.data);
  } catch (err) {
    res.status(404).send("File not found on GitHub.");
  }
});

// 404
app.get("/*", (req, res) => {
  res.render("404.ejs");
});

// Start
app.listen(PORT, () => {
  console.clear();
  cfonts.say("FuadXyro", {
    font: "block",
    align: "center",
    colors: ["blueBright", "cyan"],
    background: "transparent",
    letterSpacing: 1,
    lineHeight: 1.5,
    space: true,
    maxLength: "0",
    gradient: true,
    independentGradient: false,
    transitionGradient: false,
    env: "node",
  });
  console.log(`\x1b[36m%s\x1b[0m`, `Project by : FuadXyro`);
  console.log("\x1b[33m%s\x1b[0m", "CDN Deskripsi : Media Hosting");
  console.log("\x1b[33m%s\x1b[0m", "CDN Support : Mp3, Mp4, Image, File");
  console.log("\x1b[35m%s\x1b[0m", `Server Online. port ${PORT}`);
});
