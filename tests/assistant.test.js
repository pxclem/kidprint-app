const test = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../netlify/functions/assistant');

test('assistant returns difficulty, objective and image for search requests', async () => {
  const response = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ query: 'coloriage pour enfant de 5 ans', action: 'search' })
  });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.ok(body.recommendedActivities.length > 0, 'expected at least one activity');
  const first = body.recommendedActivities[0];
  assert.ok(first.difficulty, 'expected a difficulty field');
  assert.ok(first.objective, 'expected an objective field');
  assert.ok(first.imageUrl, 'expected an imageUrl field');
});

test('assistant returns web search results for printable activities', async () => {
  const response = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ query: 'pdf coloriage enfant imprimer', action: 'search' })
  });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.ok(Array.isArray(body.webResults), 'expected webResults array');
});
