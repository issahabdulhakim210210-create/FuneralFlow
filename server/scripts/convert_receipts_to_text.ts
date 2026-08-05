import fs from 'fs';
import path from 'path';
import { query } from '../config/db.js';
import { generateDonationReceiptDocumentFile } from '../controllers/coreController.js';

async function run() {
  const { rows } = await query(
    "select id, cloudinary_public_id, secure_url, mime_type from documents where document_type='RECEIPT' and (mime_type is null or mime_type != 'text/plain') order by created_at asc",
    []
  );

  console.log('Found receipt documents to evaluate:', rows.length);
  let migrated = 0;
  let skipped = 0;

  for (const document of rows) {
    const fileName = path.basename(String(document.cloudinary_public_id || document.secure_url || ''));
    const match = fileName.match(/^receipt-([0-9a-fA-F-]{36})(?:-\d+)?(?:\.pdf|\.txt)?$/i);
    if (!match) {
      console.log('Skipping receipt that is not a generated donation receipt:', document.id, fileName, document.mime_type);
      skipped += 1;
      continue;
    }

    const donationId = match[1];
    const donationRes = await query('select * from donations where id=$1 limit 1', [donationId]);
    const donation = donationRes.rows[0];
    if (!donation) {
      console.log('Skipping receipt with no donation match:', document.id, donationId);
      skipped += 1;
      continue;
    }

    console.log('Migrating receipt document', document.id, 'for donation', donationId);
    const uploadResult = await generateDonationReceiptDocumentFile(
      donation,
      donation.session_id,
      donation.collector_name,
      donation.collector_identifier
    );

    await query(
      'update documents set cloudinary_public_id=$1, secure_url=$2, mime_type=$3, size_bytes=$4 where id=$5',
      [uploadResult.public_id, uploadResult.secure_url, uploadResult.mimeType, uploadResult.sizeBytes, document.id]
    );

    const oldFilePath = path.resolve('uploads', fileName);
    if (fs.existsSync(oldFilePath)) {
      await fs.promises.unlink(oldFilePath).catch(() => null);
    }

    migrated += 1;
  }

  console.log(`Receipt migration complete. Migrated: ${migrated}, Skipped: ${skipped}`);
}

run().catch((error) => {
  console.error('Receipt migration failed:', error);
  process.exit(1);
});
