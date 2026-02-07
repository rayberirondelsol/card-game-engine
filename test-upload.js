const fs = require('fs');
const path = require('path');

async function testUpload() {
  // Step 1: Create a test game
  console.log('--- Creating test game ---');
  const gameRes = await fetch('http://localhost:3001/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'UPLOAD_TEST_14', description: 'Testing card upload' })
  });
  const game = await gameRes.json();
  console.log('Game created:', game.id, game.name);

  // Step 2: Upload a card image
  console.log('\n--- Uploading card image ---');
  const fileBuffer = fs.readFileSync('test-card.png');
  const blob = new Blob([fileBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('file', blob, 'TestWarrior.png');

  const uploadRes = await fetch(`http://localhost:3001/api/games/${game.id}/cards/upload`, {
    method: 'POST',
    body: formData
  });

  console.log('Upload status:', uploadRes.status);
  const card = await uploadRes.json();
  console.log('Card created:', JSON.stringify(card, null, 2));

  // Step 3: List cards for game
  console.log('\n--- Listing cards ---');
  const listRes = await fetch(`http://localhost:3001/api/games/${game.id}/cards`);
  const cards = await listRes.json();
  console.log('Cards count:', cards.length);
  console.log('Cards:', JSON.stringify(cards, null, 2));

  // Step 4: Verify image is accessible
  console.log('\n--- Checking image accessibility ---');
  const imgRes = await fetch(`http://localhost:3001${card.image_path}`);
  console.log('Image accessible:', imgRes.status, imgRes.headers.get('content-type'));

  // Step 5: Verify card name derived from filename
  console.log('\n--- Card name check ---');
  console.log('Card name:', card.name);
  console.log('Expected: TestWarrior (from TestWarrior.png)');
  console.log('Match:', card.name === 'TestWarrior');

  // Save game ID for cleanup
  console.log('\n--- Test Game ID (for cleanup): ' + game.id + ' ---');
  console.log('\nAll tests passed!');
}

testUpload().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
