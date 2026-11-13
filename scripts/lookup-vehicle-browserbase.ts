import { lookupVehicleWithBrowserbase } from '../src/lib/browserbase/vehicle-lookup';

// Default sample VIN: 2021 Toyota 4Runner (JTEBU5JR6M5845760)
const sampleVin = process.argv[2] || 'JTEBU5JR6M5845760';

async function main() {
  console.log('================================================================');
  console.log(`JACXI SHIPPING — BROWSERBASE + STAGEHAND VEHICLE VIN LOOKUP`);
  console.log(`Target VIN: ${sampleVin}`);
  console.log('================================================================\n');

  const result = await lookupVehicleWithBrowserbase({
    vin: sampleVin,
    onStep: (msg) => console.log(`→ ${msg}`),
  });

  console.log('\n✅ Vehicle Lookup Complete!');
  console.log(JSON.stringify(result, null, 2));
  console.log(`\n🔗 Session Replay & Logs: ${result.sessionUrl}`);
}

main().catch((err) => {
  console.error('\n❌ Browserbase lookup failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
