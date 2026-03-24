// plugins/withKotlinJvmTarget.js
//
// Expo config plugin that forces all Kotlin subprojects (including
// third-party packages like react-native-can-draw-overlays) to compile
// against the same JVM target as the main Android project (Java 17).
//
// This fixes:
//   "Inconsistent JVM-target compatibility detected for tasks
//    'compileDebugJavaWithJavac' (17) and 'kaptGenerateStubsDebugKotlin' (1.8)"
//
// Usage — add to app.json:
//   {
//     "expo": {
//       "plugins": [
//         "./plugins/withKotlinJvmTarget"
//       ]
//     }
//   }
//
// Then run: npx expo prebuild --clean

const { withProjectBuildGradle } = require('@expo/config-plugins');

const KOTLIN_JVM_TARGET_BLOCK = `
// ── Added by withKotlinJvmTarget config plugin ───────────────────────────────
allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            jvmTarget = '17'
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
`;

// Guard tag so the block is never appended twice on repeated prebuilds
const GUARD_TAG = '// ── Added by withKotlinJvmTarget config plugin ─';

module.exports = function withKotlinJvmTarget(config) {
  return withProjectBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      // Kotlin DSL (build.gradle.kts) — adjust syntax if needed
      return gradleConfig;
    }

    if (gradleConfig.modResults.contents.includes(GUARD_TAG)) {
      // Already patched — skip
      return gradleConfig;
    }

    gradleConfig.modResults.contents += KOTLIN_JVM_TARGET_BLOCK;
    return gradleConfig;
  });
};