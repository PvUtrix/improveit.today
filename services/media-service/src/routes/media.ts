import { Router } from 'express';
import multer from 'multer';
import { successResponse, errorResponse } from '@improveit/common';
import { logger } from '../utils/logger';
import { uploadToS3, deleteFromS3, getSignedUrl } from '../utils/s3';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// Upload single file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'No file provided')
      );
    }

    const file = req.file;
    const fileId = uuidv4();
    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${fileId}.${fileExtension}`;

    // Optimize image
    const optimizedBuffer = await sharp(file.buffer)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Create thumbnail
    const thumbnailBuffer = await sharp(file.buffer)
      .resize(400, 400, {
        fit: 'cover',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailName = `thumbnails/${fileId}.jpg`;

    // Upload to S3
    const [imageUrl, thumbnailUrl] = await Promise.all([
      uploadToS3(fileName, optimizedBuffer, 'image/jpeg'),
      uploadToS3(thumbnailName, thumbnailBuffer, 'image/jpeg'),
    ]);

    const metadata = {
      id: fileId,
      originalName: file.originalname,
      mimeType: 'image/jpeg',
      size: optimizedBuffer.length,
      url: imageUrl,
      thumbnailUrl: thumbnailUrl,
      uploadedAt: new Date().toISOString(),
    };

    logger.info(`File uploaded: ${fileId}`);

    return res.status(201).json(successResponse(metadata));
  } catch (error: any) {
    logger.error('Upload error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to upload file')
    );
  }
});

// Upload multiple files
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'No files provided')
      );
    }

    const uploadPromises = req.files.map(async (file) => {
      const fileId = uuidv4();
      const fileExtension = file.originalname.split('.').pop() || 'jpg';
      const fileName = `${fileId}.${fileExtension}`;

      // Optimize image
      const optimizedBuffer = await sharp(file.buffer)
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Create thumbnail
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(400, 400, {
          fit: 'cover',
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailName = `thumbnails/${fileId}.jpg`;

      // Upload to S3
      const [imageUrl, thumbnailUrl] = await Promise.all([
        uploadToS3(fileName, optimizedBuffer, 'image/jpeg'),
        uploadToS3(thumbnailName, thumbnailBuffer, 'image/jpeg'),
      ]);

      return {
        id: fileId,
        originalName: file.originalname,
        mimeType: 'image/jpeg',
        size: optimizedBuffer.length,
        url: imageUrl,
        thumbnailUrl: thumbnailUrl,
        uploadedAt: new Date().toISOString(),
      };
    });

    const results = await Promise.all(uploadPromises);

    logger.info(`${results.length} files uploaded`);

    return res.status(201).json(successResponse(results));
  } catch (error: any) {
    logger.error('Multiple upload error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to upload files')
    );
  }
});

// Get signed URL for direct upload
router.post('/signed-url', async (req, res) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Missing fileName or contentType')
      );
    }

    const fileId = uuidv4();
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const key = `${fileId}.${fileExtension}`;

    const signedUrl = await getSignedUrl(key, contentType);

    return res.json(
      successResponse({
        uploadUrl: signedUrl,
        key,
        fileId,
        expiresIn: 3600, // 1 hour
      })
    );
  } catch (error: any) {
    logger.error('Signed URL error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to generate signed URL')
    );
  }
});

// Delete file
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    // Delete both original and thumbnail
    await Promise.all([
      deleteFromS3(`${fileId}.jpg`),
      deleteFromS3(`thumbnails/${fileId}.jpg`),
    ]);

    logger.info(`File deleted: ${fileId}`);

    return res.json(successResponse({ deleted: true }));
  } catch (error: any) {
    logger.error('Delete error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to delete file')
    );
  }
});

export default router;
