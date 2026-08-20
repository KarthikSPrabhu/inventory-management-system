const fs = require('fs');
const path = require('path');
const backupService = require('../services/backupService');
const auditService = require('../services/auditService');
const AUDIT_ACTIONS = require('../utils/auditActions');

/**
 * GET /api/backups
 * List all available backup archives
 */
exports.listBackups = async (req, res, next) => {
  try {
    const backups = backupService.listBackups();
    res.status(200).json({
      success: true,
      count: backups.length,
      data: backups
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/backups/create
 * Create a new full database backup zip file
 */
exports.createBackup = async (req, res, next) => {
  try {
    const backupMeta = await backupService.createBackup({ user: req.user });
    res.status(201).json({
      success: true,
      message: 'Backup created successfully',
      data: backupMeta
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/backups/:filename/download
 * Download a backup zip file safely
 */
exports.downloadBackup = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const filepath = backupService.getBackupFilePath(filename);

    if (!filepath) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }

    // Log Audit Event
    await auditService.log({
      user: req.user,
      action: AUDIT_ACTIONS.BACKUP_DOWNLOAD,
      resourceType: 'System',
      resourceName: filename,
      description: `Downloaded backup file ${filename}`,
      metadata: { filename }
    });

    res.download(filepath, filename);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/backups/preview
 * Parse and validate a backup (from server file or uploaded zip) without modifying database
 */
exports.previewBackup = async (req, res, next) => {
  try {
    let zipSource = null;
    let filename = 'uploaded-backup.zip';

    if (req.file) {
      zipSource = req.file.buffer;
      filename = req.file.originalname;
    } else if (req.body.filename) {
      filename = req.body.filename;
      zipSource = backupService.getBackupFilePath(filename);
      if (!zipSource) {
        return res.status(404).json({
          success: false,
          message: `Backup file '${filename}' not found on server`
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide a backup zip file or specify a server filename'
      });
    }

    const validation = backupService.validateBackup(zipSource);

    res.status(200).json({
      success: true,
      data: {
        filename,
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        manifest: validation.manifest,
        collectionCounts: validation.collectionCounts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/backups/restore
 * Safely restore a backup after validation and pre-restore safety backup
 */
exports.restoreBackup = async (req, res, next) => {
  try {
    const { confirmRestore, filename } = req.body;

    if (!confirmRestore) {
      return res.status(400).json({
        success: false,
        message: 'Explicit user confirmation required (confirmRestore: true) before restoring database.'
      });
    }

    let zipSource = null;
    if (req.file) {
      zipSource = req.file.buffer;
    } else if (filename) {
      zipSource = backupService.getBackupFilePath(filename);
      if (!zipSource) {
        return res.status(404).json({
          success: false,
          message: `Backup file '${filename}' not found on server`
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide an uploaded backup file or select an existing backup filename.'
      });
    }

    const result = await backupService.restoreBackup(zipSource, req.user);

    res.status(200).json({
      success: true,
      message: 'Database restored successfully.',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Restoration failed'
    });
  }
};
