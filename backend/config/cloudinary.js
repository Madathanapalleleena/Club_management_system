const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Creates a multer upload middleware backed by Cloudinary.
 * @param {string} folder  - Cloudinary folder name (e.g. 'cms/grc')
 * @param {string[]} allowedFormats - e.g. ['pdf','jpg','png','jpeg']
 */
function makeUpload(folder, allowedFormats = ['pdf', 'jpg', 'jpeg', 'png', 'webp']) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      allowed_formats: allowedFormats,
      resource_type: 'auto',         // handles PDFs & images alike
      use_filename: true,
      unique_filename: true,
    },
  });
  return multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });
}

module.exports = { cloudinary, makeUpload };
