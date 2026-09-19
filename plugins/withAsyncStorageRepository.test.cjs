const assert = require('node:assert/strict');
const test = require('node:test');
const withAsyncStorageRepository = require('./withAsyncStorageRepository');

async function applyPlugin(contents, language = 'groovy') {
  const config = withAsyncStorageRepository({ name: 'POWL', slug: 'POWL' });
  const result = await config.mods.android.projectBuildGradle({
    ...config,
    modResults: { contents, language },
    modRequest: { platform: 'android', modName: 'projectBuildGradle', introspect: false },
  });
  return result.modResults.contents;
}

test('registers the bundled repository without changing existing repositories', async () => {
  const original = 'allprojects { repositories { google(); mavenCentral() } }\n';
  const result = await applyPlugin(original);
  assert.ok(result.startsWith(original));
  assert.match(result, /project\(':react-native-async-storage_async-storage'\)\.file\('local_repo'\)/);
  assert.equal(await applyPlugin(result), result);
});

test('rejects unsupported Gradle syntax instead of generating invalid code', async () => {
  await assert.rejects(applyPlugin('', 'kotlin'), /requires a Groovy/);
});
