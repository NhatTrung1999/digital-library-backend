import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const allowedExtensions = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'msg',
  'csv',
  'txt',
  '3dm',
];

export const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-outlook',
  'text/csv',
  'text/plain',
  'application/octet-stream',
];

export const fileFilter = (req, file, callback) => {
  const ext = extname(file.originalname).replace('.', '').toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return callback(
      new BadRequestException('File extension not allowed'),
      false,
    );
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new BadRequestException('File mime type not allowed'),
      false,
    );
  }

  callback(null, true);
};

export const editFileName = (req, file, callback) => {
  const ext = extname(file.originalname);
  const fileName = `${uuidv4()}${ext}`;
  callback(null, fileName);
};
