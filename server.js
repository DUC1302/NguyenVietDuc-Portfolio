const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and parsing of JSON/urlencoded bodies
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage configuration for avatar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    // Keep it simple and overwrite with avatar.png/jpg
    cb(null, 'avatar' + ext);
  }
});
const upload = multer({ storage });

// API: Get portfolio configuration
app.get('/api/data', (req, res) => {
  const dataPath = path.join(__dirname, 'portfolio-data.json');
  if (!fs.existsSync(dataPath)) {
    return res.status(404).json({ error: 'portfolio-data.json not found' });
  }
  try {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(rawData);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data file' });
  }
});

// API: Save portfolio configuration (automatically scans and embeds directory files)
app.post('/api/save', (req, res) => {
  const data = req.body;
  
  if (data.projects) {
    Object.keys(data.projects).forEach(projectName => {
      const safeProjectName = path.basename(projectName);
      const projectPath = path.join(__dirname, safeProjectName);
      
      if (fs.existsSync(projectPath) && fs.statSync(projectPath).isDirectory()) {
        try {
          const files = fs.readdirSync(projectPath)
            .filter(file => {
              return !file.startsWith('.') && 
                     file !== 'node_modules' && 
                     file !== 'package.json' && 
                     file !== 'server.js' && 
                     file !== 'portfolio-data.json';
            })
            .map(file => {
              const filePath = path.join(projectPath, file);
              const fileStats = fs.statSync(filePath);
              return {
                name: file,
                sizeBytes: fileStats.size,
                isDir: fileStats.isDirectory(),
                url: `./${encodeURIComponent(safeProjectName)}/${encodeURIComponent(file)}`
              };
            });
          data.projects[projectName].files = files;
        } catch (err) {
          console.error(`Failed to scan files for ${projectName}:`, err);
        }
      }
    });
  }

  const dataPath = path.join(__dirname, 'portfolio-data.json');
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true, message: 'Portfolio updated successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to write data file' });
  }
});

// API: Upload profile picture (avatar)
app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Use relative path with forward slashes for static hosting flexibility
  const relativePath = `./uploads/${req.file.filename}`;
  const dataPath = path.join(__dirname, 'portfolio-data.json');
  
  try {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(rawData);
    data.profile.avatar = relativePath;
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true, avatarUrl: relativePath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Avatar saved but profile config update failed' });
  }
});

// API: List files within a project directory (active scan fallback)
app.get('/api/project-files', (req, res) => {
  const projectName = req.query.name;
  if (!projectName) {
    return res.status(400).json({ error: 'Project name query parameter is required' });
  }

  const safeProjectName = path.basename(projectName);
  const projectPath = path.join(__dirname, safeProjectName);

  if (!fs.existsSync(projectPath)) {
    return res.json({ files: [] });
  }

  try {
    const stats = fs.statSync(projectPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Target is not a directory' });
    }

    const files = fs.readdirSync(projectPath)
      .filter(file => {
        return !file.startsWith('.') && 
               file !== 'node_modules' && 
               file !== 'package.json' && 
               file !== 'server.js' && 
               file !== 'portfolio-data.json';
      })
      .map(file => {
        const filePath = path.join(projectPath, file);
        const fileStats = fs.statSync(filePath);
        return {
          name: file,
          sizeBytes: fileStats.size,
          isDir: fileStats.isDirectory(),
          url: `./${encodeURIComponent(safeProjectName)}/${encodeURIComponent(file)}`
        };
      });

    res.json({ files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error scanning project folder files' });
  }
});

// Serve uploads statically
app.use('/uploads', express.static(uploadDir));
app.use('/NguyenVietDuc-Portfolio/uploads', express.static(uploadDir));

// Recruiter Subdirectory Alias Route
app.use('/NguyenVietDuc-Portfolio', express.static(__dirname));

// Serve everything else in the workspace statically (project folders, frontend assets, index.html, etc.)
app.use(express.static(__dirname));

// Start server
app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`  PORTFOLIO BUILDER SERVER RUNNING`);
  console.log(`  Local URL:  http://localhost:${PORT}`);
  console.log(`  Directory:  ${__dirname}`);
  console.log(`=============================================================`);
});
