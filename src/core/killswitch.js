export const killswitch_config = {
    killswitch_page: "User:LuniZunie/killswitch.js",
    polling_interval: 10000 // Check every 10 seconds
};

export const killswitch_status = {
    disabled: false,
    reload: {
        soft: false,
        hard: false,
    },

    alerts: [ ]
};

export async function checkKillswitch(api, startup = true) {
    try {
        const domain = mw.config.get("wgServerName") === "test.wikipedia.org" ? "test.wikipedia.org" : "en.wikipedia.org";

        const content = await fetch(`https://${mw.config.get("wgServer")}/w/api.php?action=query&prop=revisions&rvprop=content&format=json&origin=*&titles=${encodeURIComponent(killswitch_config.killswitch_page)}`)
            .then(response => response.json())
            .then(data => {
                const pages = data.query.pages;
                const pageId = Object.keys(pages)[0];
                return pages[pageId].revisions[0]['*'];
            });

        if (!content) {
            console.warn("BITER: Killswitch page not found or could not be fetched");
            return killswitch_status;
        }

        const data = JSON.parse(content)?.BITER;

        // Update status
        if (typeof data.disabled === 'boolean') {
            killswitch_status.disabled = data.disabled;
        }

        const soft = data.reload?.soft;
        const hard = data.reload?.hard;

        if (startup) {
            if (typeof soft === "number") {
                window.sessionStorage.setItem("BITER:SoftReload", soft);
            }
            if (typeof hard === "number") {
                window.sessionStorage.setItem("BITER:HardReload", hard);
            }
        } else {
            if (typeof soft === "number") {
                const current = +window.sessionStorage.getItem("BITER:SoftReload");
                if (soft > current) {
                    window.sessionStorage.setItem("BITER:SoftReload", soft);

                    console.log("BITER: Soft reload triggered by killswitch");
                    killswitch_status.alerts.push({
                        id: `app-${performance.now()}`,
                        type: "app",
                        subtype: "soft-reload",
                        timestamp: Date.now(),
                        title: "A newer version of BITER has been released!",
                        agent: "BITER Development",
                        category: "BITER",
                        read: false
                    });
                }
            }
            if (typeof hard === "number") {
                const current = +window.sessionStorage.getItem("BITER:HardReload");
                if (hard > current) {
                    window.sessionStorage.setItem("BITER:HardReload", hard);
                    window.sessionStorage.setItem("BITER:SendHardReloadAlert", true);

                    console.log("BITER: Hard reload triggered by killswitch");
                    history.replaceState({ page: "BITER-reload" }, "", window.location.href);
                    location.reload();
                }
            }
        }

        return killswitch_status;
    } catch (err) {
        console.error("BITER: Failed to check killswitch:", err);
        // Return current state on error (don't disable BITER on network failures)
        return killswitch_status;
    }
}

export function startKillswitchPolling(api, callback) {
    const poll = async () => {
        await checkKillswitch(api, false);

        if (typeof callback === "function") {
            callback(killswitch_status);
        }

        // Schedule next check (only if not force reloaded)
        setTimeout(poll, killswitch_config.polling_interval);
    };

    // Start polling
    poll();
}
