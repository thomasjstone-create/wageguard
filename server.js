require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get(/^\/[^.]+$/, (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  const routePath = req.path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!routePath) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }

  const candidatePath = path.join(__dirname, `${routePath}.html`);
  if (fs.existsSync(candidatePath)) {
    return res.sendFile(candidatePath);
  }

  return next();
});

app.use(express.static(path.join(__dirname)));

app.listen(port, () => {
  console.log(`Wage Guard server listening on port ${port}`);
});
