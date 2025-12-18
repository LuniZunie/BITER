// <nowiki>

import { killswitch_status, checkKillswitch, startKillswitchPolling } from './core/killswitch.js';

export const __script__ = {
	version: "1.0.0",

	pages: {
		AIV: "Wikipedia:Administrator intervention against vandalism",
		RFPP: "Wikipedia:Requests for page protection/Increase"
	},

	config: {
		refresh: {
			users: 2000,
            contributions: 2000,
		},
	},
};

{
	"use strict";

	let biter;
	const link1 = mw.util.addPortletLink(
		'p-personal',
		mw.util.getUrl('Wikipedia:BITER/run'),
		'BITER',
		'pt-BITER',
		'BITER',
		null,
		'#pt-preferences'
	);

	// add link to sticky header for Vector2022
	const link2 = mw.util.addPortletLink(
		'p-personal-sticky-header',
		mw.util.getUrl('Wikipedia:BITER/run'),
		'BITER',
		'pt-BITER',
		'BITER',
		null,
		'#pt-preferences'
	);

	const load = () => {
		const storageLogs = new StorageManager().load(StorageManager.versions.get(0).default).logs;
		if (storageLogs.some(log => !log.expected)) {
			StorageManager.outputLogs(storageLogs, "LoadTest");
			mw.notify("An error has occurred with the BITER storage system that could lead to data loss. For that reason, BITER has been automatically disabled. Please check your browser console for more information and immediately report this to the development team.", { type: 'error' });
			return;
		}

		window.onpopstate = (event) => {
			if (event.state?.page !== "BITER") {
				window.location.reload();
				window.onpopstate = null;
			}
		};

		// Create a temporary API instance to check killswitch before full initialization
		const tempApi = new API(null, new mw.Api());

		// Check killswitch before initializing
		checkKillswitch(tempApi, true).then(() => {
			if (killswitch_status.disabled) {
				console.log("BITER: Disabled by killswitch");
				mw.notify("BITER is currently disabled by the development team.", { type: 'error' });
				return;
			}

			if (window.sessionStorage.getItem("BITER:SendHardReloadAlert"))  {
				window.sessionStorage.removeItem("BITER:SendHardReloadAlert");
				killswitch_status.alerts.push({
					id: `app-${performance.now()}`,
					type: "app",
					subtype: "hard-reload",
					timestamp: Date.now(),
					title: "The development team has forced a reload.",
					agent: "BITER Development",
					category: "BITER",
					read: false
				});
			}

			BITER = new BITER();
			BITER.init().then(() => {
				const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent);
				const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
				const isDesktop = !isIOS && !/android/i.test(navigator.userAgent);

				// SAFARI (non-iOS) – visibilitychange works
				if (isSafari && !isIOS) {
					document.addEventListener("visibilitychange", () => {
						if (document.visibilityState === "hidden") {
							BITER.save();
						}
					});
				}

				// iOS – pagehide is required because visibilitychange is unreliable
				if (isIOS) {
					window.addEventListener("pagehide", () => {
						BITER.save();
					});
				}

				// Desktop – beforeunload is the only consistent option
				if (isDesktop) {
					window.addEventListener("beforeunload", () => {
						BITER.save();
					});
				}

				for (const alert of killswitch_status.alerts) {
					BITER.alerts.unshift(alert);
				}

				killswitch_status.alerts = [ ];

				// Start killswitch polling after successful initialization
				startKillswitchPolling(BITER.api, data => {
					if (data.disabled === true) {
						history.replaceState({ page: "BITER-reload" }, "", window.location.href);
                    	location.reload();
						return;
					}

					for (const alert of data.alerts) {
						BITER.alerts.unshift(alert);
					}

					data.alerts = [ ];
				});
			});

			window.addEventListener("keydown", BITER.keyPressed.bind(BITER));
		}).catch((err) => {
			console.error("BITER: Failed to check killswitch:", err);
			mw.notify("BITER: Failed to check killswitch. Loading anyway...", { type: 'warn' });

			// Initialize anyway if killswitch check fails (network issues shouldn't prevent loading)
			BITER = new BITER();
			BITER.init().then(() => {
				const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent);
				const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
				const isDesktop = !isIOS && !/android/i.test(navigator.userAgent);

				// SAFARI (non-iOS) – visibilitychange works
				if (isSafari && !isIOS) {
					document.addEventListener("visibilitychange", () => {
						if (document.visibilityState === "hidden") {
							BITER.save();
						}
					});
				}

				if (isIOS) {
					window.addEventListener("pagehide", (e) => {
						BITER.save();
					});
				}

				if (isDesktop) {
					window.addEventListener("beforeunload", () => {
						BITER.save();
					});
				}

				for (const alert of killswitch_status.alerts) {
					BITER.alerts.unshift(alert);
				}

				killswitch_status.alerts = [ ];

				// Start killswitch polling after successful initialization
				startKillswitchPolling(BITER.api, data => {
					if (data.disabled === true) {
						history.replaceState({ page: "BITER-reload" }, "", window.location.href);
                    	location.reload();
						return;
					}

					for (const alert of data.alerts) {
						BITER.alerts.unshift(alert);
					}

					data.alerts = [ ];
				});
			});
			window.addEventListener("keydown", BITER.keyPressed.bind(BITER));

			window.addEventListener("error", (event) => {
				console.error("BITER: Unhandled error:", event.error);
			});
		});
	};

	const onClick = (e) => {
		e.preventDefault();
		history.pushState({ page: "BITER" }, "", window.location.href);

		load();
	};
	link1?.addEventListener('click', onClick);
	link2?.addEventListener('click', onClick);

	window.addEventListener("popstate", (event) => {
		if (event.state?.page === "BITER") {
			load();
		}
	});

	// this switch statement handles incredibly unique edge cases that would be fucking annoying as shit for users to deal with
	switch (history.state?.page) {
		case "BITER": {
			history.replaceState(null, "", window.location.href);
		} break;
		case "BITER-reload": {
			history.replaceState({ page: "BITER" }, "", window.location.href);
			load();
		} break;
	}

	if (mw.config.get("wgRelevantPageName") === "Wikipedia:BITER/run" && mw.config.get("wgAction") === "view") {
		history.pushState({ page: "BITER" }, "", window.location.href);
		load();
	}
}

// </nowiki>