import DetectEngine from 'appcd-detect';
import gawk from 'gawk';
import version from './version';

import { arrayify, get } from 'appcd-util';
import { DataServiceDispatcher } from 'appcd-dispatcher';
import { detect, jdkLocations } from 'jdklib';
import { exe } from 'appcd-subprocess';

/**
 * The JDK info service.
 */
export default class JDKInfoService extends DataServiceDispatcher {
	/**
	 * Starts the detect engine.
	 *
	 * @param {Config} cfg - An Appc Daemon config object.
	 * @returns {Promise}
	 * @access public
	 */
	async activate(cfg) {
		this.data = gawk([]);

		const paths = arrayify(get(cfg, 'java.searchPaths'), true).concat(jdkLocations[process.platform]);
		const keys = [
			'HKLM\\SOFTWARE\\JavaSoft\\Java Development Kit',
			'HKLM\\SOFTWARE\\Wow6432Node\\JavaSoft\\Java Development Kit',
			'HKLM\\SOFTWARE\\JavaSoft\\JDK'
		];

		this.engine = new DetectEngine({
			checkDir:       this.checkDir.bind(this),
			depth:          1,
			env:            'JAVA_HOME',
			exe:            `javac${exe}`,
			multiple:       true,
			paths,
			processResults: this.processResults.bind(this),
			redetect:       true,
			registryKeys:   keys.map(key => ({
				key,
				depth: 1,
				value: 'JavaHome',
				transform(state, { winreglib }) {
					try {
						state.isDefault = winreglib.get(`${key}\\${winreglib.get(key, 'CurrentVersion')}`, 'JavaHome');
					} catch (e) {
						state.isDefault = false;
					}
				}
			})),
			watch: true
		});

		this.engine.on('results', results => gawk.set(this.data, results));

		await this.engine.start();

		gawk.watch(cfg, [ 'java', 'searchPaths' ], value => {
			this.engine.paths = arrayify(value, true).concat(jdkLocations[process.platform]);
		});
	}

	/**
	 * Stops the detect engine.
	 *
	 * @access public
	 */
	async deactivate() {
		if (this.engine) {
			await this.engine.stop();
			this.engine = null;
		}
	}

	/**
	 * Determines if the specified directory contains a JDK and if so, returns the JDK info.
	 *
	 * @param {String} dir - The directory to check.
	 * @returns {Promise}
	 * @access private
	 */
	async checkDir(dir) {
		try {
			return await detect(dir);
		} catch (e) {
			// `dir` is not a jdk
		}
	}

	/**
	 * Sorts the JDKs and assigns a default.
	 *
	 * @param {Array.<JDK>} results - An array of JDKs.
	 * @param {DetectEngine} engine - The detect engine instance.
	 * @access private
	 */
	processResults(results, engine) {
		// sort the jdks
		if (results.length > 1) {
			results.sort((a, b) => {
				let r = version.compare(a.version, b.version);
				if (r !== 0) {
					return r;
				}

				r = (a.build || 0) - (b.build || 0);
				if (r !== 0) {
					return r;
				}
				return a.arch.localeCompare(b.arch);
			});
		}

		// loop over all of the new jdks and set default version
		if (results.length) {
			let foundDefault = false;
			for (const result of results) {
				if (!foundDefault && (!engine.defaultPath || result.path === engine.defaultPath)) {
					result.default = true;
					foundDefault = true;
				} else {
					result.default = false;
				}
			}

			// no default found the system path, so just select the last/newest one as the default
			if (!foundDefault) {
				results[results.length - 1].default = true;
			}
		}
	}
}
