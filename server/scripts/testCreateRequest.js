import { Client } from 'pg';

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Set DATABASE_URL');
    process.exit(1);
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const orgRes = await client.query('select id from organizers limit 1');
    const famRes = await client.query('select id from family_members limit 1');
    if (orgRes.rows.length === 0 || famRes.rows.length === 0) {
      console.error('No organizers or family_members found; create test records first');
      process.exit(1);
    }
    const organizerId = orgRes.rows[0].id;
    const familyMemberId = famRes.rows[0].id;

    const selectedServices = [];
    const servicePricingDetails = { security_count: 2, usher_count: 1, logistics_chairs: 10, logistics_tables: 3, logistics_souvenirs: 5 };
    const guestBreakdown = { family: 5, friends: 3 };

    const params = [
      familyMemberId,
      organizerId,
      'Test Deceased',
      1000,
      JSON.stringify(guestBreakdown),
      10,
      JSON.stringify(servicePricingDetails),
      1200,
      servicePricingDetails.security_count,
      servicePricingDetails.usher_count,
      servicePricingDetails.logistics_chairs,
      servicePricingDetails.logistics_tables,
      servicePricingDetails.logistics_souvenirs,
      JSON.stringify(selectedServices),
      'PENDING'
    ];

    const sql = `
    insert into funeral_requests (
      family_member_id,
      organizer_id,
      deceased_full_name,
      budget,
      guest_breakdown,
      projected_attendance,
      service_pricing_details,
      calculated_total,
      security_count,
      usher_count,
      logistics_chairs,
      logistics_tables,
      logistics_souvenirs,
      selected_services,
      status
    )
    values ($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)
    returning *
    `;

    const res = await client.query(sql, params);
    console.log('Insert succeeded:', res.rows[0]);
  } catch (err) {
    console.error('Insert failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
