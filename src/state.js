const defaultState = {
    grossRevenue: 95000,
    bizExpenses: 25000,
    customPerks: [],
    customChecks: [],
    profile: {}
};

window.StateStore = {
    state: { ...defaultState },

    init: async function() {
        if (window.electronAPI) {
            const stored = await window.electronAPI.getState();
            if (stored && Object.keys(stored).length > 0) {
                this.state = { ...defaultState, ...stored };
            }
        } else {
            console.warn("Electron IPC unavailable. Falling back to localStorage for dev rendering.");
            const stored = localStorage.getItem('azphoto_state');
            if (stored) {
                try {
                    this.state = { ...defaultState, ...JSON.parse(stored) };
                } catch (e) {}
            }
        }
        window.dispatchEvent(new CustomEvent('StateStoreReady'));
    },

    save: function() {
        if (window.electronAPI) {
            window.electronAPI.setState(this.state);
        } else {
            localStorage.setItem('azphoto_state', JSON.stringify(this.state));
        }
    },

    update: function(key, value) {
        this.state[key] = value;
        this.save();
    }
};

window.StateStore.init();
