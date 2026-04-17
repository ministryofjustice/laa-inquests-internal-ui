import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';
import { builtinModules } from 'node:module';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'node:path';
import chokidar from 'chokidar';
import { getBuildNumber } from './src/infrastructure/build/getBuildInfo.js';
import type { SassPluginOptions } from './src/infrastructure/build/sass.types.js';

// Load environment variables
dotenv.config();
const buildNumber = getBuildNumber();
const NO_MORE_ASYNC_OPERATIONS = 0;
const UNCAUGHT_FATAL_EXCEPTION = 1;
const SECOND_IN_ARRAY = 1;

/* Copies GOV.UK (fonts and images from `govuk-frontend`), MOJ Frontend (images from `@ministryofjustice/frontend`) and other assets
 to the `public/assets` directory. */
const copyAssets = async (): Promise<void> => {
	try {
		// GOV.UK assets
		await fs.copy(
			path.resolve('./node_modules/govuk-frontend/dist/govuk/assets'),
			path.resolve('./public/assets')
		);
		// Copy GOVUK rebrand assets for brand refresh
		await fs.copy(
			path.resolve('./node_modules/govuk-frontend/dist/govuk/assets/rebrand'),
			path.resolve('./public/assets/rebrand')
		);
		// Copy MOJ Frontend assets
		await fs.copy(
			path.resolve('./node_modules/@ministryofjustice/frontend/moj/assets/images'),
			path.resolve('./public/assets/images')
		);
		console.log('✅ GOV.UK assets (including rebrand) & MOJ Frontend assets copied successfully.');
	} catch (error) {
		console.error('❌ Failed to copy assets:', error);
		process.exit(UNCAUGHT_FATAL_EXCEPTION);
	}
};

// List of external dependencies that should not be bundled.
const externalModules: string[] = [
	...builtinModules,
	'express',
	'nunjucks',
	'dotenv',
	'cookie-signature',
	'cookie-parser',
	'body-parser',
	'express-session',
	'morgan',
	'compression',
	'axios',
	'middleware-axios',
	'util',
	'path',
	'fs',
	'figlet',
	'csrf-sync',
	'http-errors',
	'*.node'
];

const buildScss = async (watch = false): Promise<esbuild.BuildContext | undefined> => {
	const options: esbuild.BuildOptions = {
		entryPoints: ['src/infrastructure/build/scss/main.scss'],
		bundle: true,
		outfile: `public/css/main.${buildNumber}.css`,
		external: ['*.woff', '*.woff2', '*.svg', '*.png', '*.jpg', '*.jpeg', '*.gif'],
		plugins: [
			sassPlugin({
				loadPaths: [
					path.resolve('.'), // Current directory
					path.resolve('node_modules') // Node modules directory
				],
				// Transforms SCSS content to update asset paths.
				transform: (source: string): string =>
					source
						.replace(/url\(["']?\/assets\/fonts\/([^"'\)]+)["']?\)/gv, 'url("/assets/fonts/$1")')
						.replace(/url\(["']?\/assets\/images\/([^"'\)]+)["']?\)/gv, 'url("/assets/images/$1")')
			} satisfies SassPluginOptions)
		],
		loader: {
			'.scss': 'css',
			'.css': 'css'
		},
		minify: process.env.NODE_ENV === 'production',
		sourcemap: process.env.NODE_ENV !== 'production'
	};

	if (watch) {
		const context = await esbuild.context(options);
		await context.watch();
		return context;
	} else {
		await esbuild.build(options).catch((error: unknown) => {
			console.error('❌ SCSS build failed:', error);
			process.exit(UNCAUGHT_FATAL_EXCEPTION);
		});
		return undefined;
	}
};

const buildAppJs = async (watch = false): Promise<esbuild.BuildContext | undefined> => {
	const options: esbuild.BuildOptions = {
		entryPoints: ['src/app.ts'],
		bundle: true,
		platform: 'node',
		target: 'esnext',
		format: 'esm',
		sourcemap: process.env.NODE_ENV !== 'production',
		minify: process.env.NODE_ENV === 'production',
		loader: {
			'.js': 'jsx',
			'.ts': 'tsx',
			'.json': 'json',
		},
		external: externalModules,
		outfile: 'public/app.js'
	};

	if (watch) {
		const context = await esbuild.context(options);
		await context.watch();
		return context;
	} else {
		await esbuild.build(options).catch((error: unknown) => {
			console.error('❌ app.js build failed:', error);
			process.exit(UNCAUGHT_FATAL_EXCEPTION);
		});
		return undefined;
	}
};

const buildFrontendPackages = async (watch = false): Promise<esbuild.BuildContext | undefined> => {
	const options: esbuild.BuildOptions = {
		entryPoints: [
			"src/infrastructure/build/frontend-packages-entry.ts"
		],
		bundle: true,
		platform: 'browser',
		target: 'esnext',
		format: 'esm',
		sourcemap: process.env.NODE_ENV !== 'production',
		minify: process.env.NODE_ENV === 'production',
		treeShaking: false, // Disable tree shaking to preserve side-effect imports
		outfile: `public/js/frontend-packages.${buildNumber}.min.js`
	};

	if (watch) {
		const context = await esbuild.context(options);
		await context.watch();
		return context;
	} else {
		await esbuild.build(options).catch((error: unknown) => {
			console.error('❌ GOV.UK frontend and/or MOJ frontend JS build failed:', error);
			process.exit(UNCAUGHT_FATAL_EXCEPTION);
		});
		return undefined;
	}
};

const watchBuild = async (): Promise<void> => {
	try {
		// Copy assets initially
		await copyAssets();

		// Start all watchers
		const contexts = await Promise.all([
			buildScss(true),
			buildAppJs(true),
			buildFrontendPackages(true)
		]);

		// Watch for asset changes and copy them
		const filesToIgnore = /node_modules\/(?!govuk-frontend|@ministryofjustice)/v
		const assetWatcher = chokidar.watch(['node_modules/govuk-frontend/dist/govuk/assets/**/*', 'node_modules/@ministryofjustice/frontend/moj/assets/images/**/*'], {
			ignored: filesToIgnore,
			persistent: true
		});

		const handleAssetChange = (): void => {
			copyAssets().catch((error: unknown) => {
				console.error('❌ Failed to copy assets on change:', error);
			});
		};

		assetWatcher.on('change', handleAssetChange);

		console.log('✅ Watch mode started successfully. Watching for file changes...');

		const handleSigint = (): void => {
			console.log('\n🛑 Stopping watch mode...');
			void Promise.all(
				contexts
					.filter((context): context is esbuild.BuildContext => context !== undefined)
					.map(async (context) => { await context.dispose(); })
			).then(() => {
				void assetWatcher.close();
				process.exit(NO_MORE_ASYNC_OPERATIONS);
			}).catch((error: unknown) => {
				console.error('❌ Error during cleanup:', error);
				process.exit(UNCAUGHT_FATAL_EXCEPTION);
			});
		};

		process.on('SIGINT', handleSigint);

	} catch (error: unknown) {
		console.error('❌ Watch mode setup failed:', error);
		process.exit(UNCAUGHT_FATAL_EXCEPTION);
	}
};

const build = async (): Promise<void> => {
	try {
		console.log('🚀 Starting build process...');

		// Copy assets
		await copyAssets();

		// Build all files
		await Promise.all([
			buildScss(false),
			buildAppJs(false),
			buildFrontendPackages(false)
		]);

		console.log('✅ Build completed successfully.');
	} catch (error: unknown) {
		console.error('❌ Build process failed:', error);
		process.exit(UNCAUGHT_FATAL_EXCEPTION);
	}
};

// Export functions
export { build, watchBuild };

// Run based on command line arguments
if (import.meta.url === `file://${process.argv[SECOND_IN_ARRAY]}`) {
	const isWatch = process.argv.includes('--watch');

	if (isWatch) {
		watchBuild().catch((error: unknown) => {
			console.error('❌ Watch mode failed:', error);
			process.exit(UNCAUGHT_FATAL_EXCEPTION);
		});
	} else {
		build().catch((error: unknown) => {
			console.error('❌ Build script failed:', error);
			process.exit(UNCAUGHT_FATAL_EXCEPTION);
		});
	}
}
