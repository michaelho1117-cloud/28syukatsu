// Using built-in fetch in Node.js 18+
async function checkApi() {
  try {
    const res = await fetch('http://localhost:8789/api/core/accounts');
    if (!res.ok) {
      console.log(`API check failed with status: ${res.status}`);
      return;
    }
    const data = await res.json();
    console.log('--- API Accounts Data ---');
    console.log(JSON.stringify(data, null, 2));
    console.log(`Total Accounts via API: ${data.length}`);
  } catch (err) {
    console.error('API connection error:', err.message);
  }
}

checkApi();
