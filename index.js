/* eslint-disable no-useless-escape */
/* eslint-disable no-multi-spaces */
/* eslint-disable no-shadow */
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const yup = require('yup');
const monk = require('monk');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { nanoid } = require('nanoid');
require('dotenv').config();

// Load ENV Variables.
const db = monk(process.env.MONGO_DB_URI);  // Setup DB Connection.
const urls = db.get('urls');                // Get available URLs.

// Setup express server.
const app = express();
app.enable('trust proxy');
app.use(helmet());
app.use(morgan('common'));
app.use(express.json());
app.use(express.static('./public'));

// Setup Data.
const port = process.env.PORT || 8888;
const badPath = path.join(__dirname, 'public/404.html');

// Setup Request Schema.
const schema = yup.object().shape({
  path: yup.string().trim().matches(/^[\w\-]+$/i),
  url: yup.string().trim().url().required(),
});

// Redirect for given path.
app.get('/:path', async (req, res) => {

  // Get path from request.
  const { path } = req.params;

  try {

    // Get URL based on incomming path.
    const currentUrl = await urls.findOne({ path });

    // Check URL exists.
    if (currentUrl) {
      return res.redirect(currentUrl.url);
    }

    // Bad path, send 404.
    return res.status(404).sendFile(badPath);

  } catch (error) {

    // Error occured, send 404.
    return res.status(404).sendFile(badPath);

  }

});

// Create Shorten URL
app.post('/url', slowDown({
  windowMs: process.env.SUBMIT_DELAY,
  delayAfter: 1,
  delayMs: 500,
}), rateLimit({
  windowMs: process.env.SUBMIT_DELAY,
  max: 1,
}), async (req, res, next) => {

  // Setup data.
  const { url } = req.body;
  let { path } = req.body;

  try {

    // Validate response data.
    await schema.validate({ path, url });

    // Check  url does not include current domain name.
    if (url.includes('drcodebase.com')) {
      throw new Error('Do not create redirect loops...');
    }

    // Handle path data.
    if (!path) {
      path = nanoid(8);
    } else {
      const pathExists = await urls.findOne({ path });
      if (pathExists) {
        throw new Error(`Current path=[${path}] already exists.`);
      }
    }

    // Set path to all lowercase.
    path = path.toLowerCase();

    // Add new url to database.
    const urlCreated = await urls.insert({ path, url });

    // Update response.
    res.json(urlCreated);

  } catch (error) {

    // Error occured.
    next(error);

  }

});

// Handle bad request.
// eslint-disable-next-line no-unused-vars
app.use((req, res, next) => {
  res.status(404).sendFile(badPath);
});

// Handle error from post request.
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {

  // Update error status.
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }

  // Update response.
  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? 'error' : error.stack,
  });

});

// Setup port.
app.listen(port, () => {
  console.debug(`Listening at http://localhost:${port}`);
});
