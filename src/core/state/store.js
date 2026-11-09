import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import { broadcast } from "./sync.js";

export const useStore = create(
  immer((set, get) => ({
    // ── Bible ──
    translations: [],
    activeTemplateId: "scripture-full",
    altTranslation: null, // second translation for dual-translation template
    altVerses: [],
    notesText: "",
    activeTranslation: "KJV",
    books: [],
    activeReference: null, // { bookId, chapter, verseStart, verseEnd }
    activeVerses: [], // [{ verse, text }]
    activeReferenceLabel: "", // "John 3:16-18"

    setActiveTemplate: (id) => {
      set(s => { s.activeTemplateId = id; });
      broadcast('output:set-template', { id });
    },

    setTranslations: (list) =>
      set((s) => {
        s.translations = list;
      }),
    setActiveTranslation: (id) => {
      set((s) => {
        s.activeTranslation = id;
      });
      broadcast("state:translation-changed", { id });
    },
    setBooks: (list) =>
      set((s) => {
        s.books = list;
      }),
      setActivePassage: (ref, verses, label) => {
        console.log('[setActivePassage]', { label, verseCount: verses?.length });
        set(s => {
          s.activeReference = ref;
          s.activeVerses = verses;
          s.activeReferenceLabel = label;
          s.contentKey = (s.contentKey || 0) + 1;
        });
        broadcast('output:render-passage', { ref, verses, label });
      },

      // Advance: try next slide in current item, else next item
      advance: () => {
        const { activeService, activeItemIndex, activeSlideIndex } = get();
        if (!activeService || !activeService.items?.length) {
          console.warn('[advance] no active service or empty items');
          return;
        }
      
        // Nothing live yet → go live on item 0
        if (activeItemIndex < 0) {
          get().goLive(0, 0);
          return;
        }
      
        const item = activeService.items[activeItemIndex];
        const slides = item?.data?.slides || [];
      
        if (slides.length > 0 && activeSlideIndex < slides.length - 1) {
          // More slides in this item
          get().goLive(activeItemIndex, activeSlideIndex + 1);
        } else if (activeItemIndex < activeService.items.length - 1) {
          // Move to next item
          get().goLive(activeItemIndex + 1, 0);
        } else {
          console.log('[advance] already at the last item');
        }
      },
      
      regress: () => {
        const { activeService, activeItemIndex, activeSlideIndex } = get();
        if (!activeService || !activeService.items?.length) return;
      
        if (activeItemIndex < 0) {
          get().goLive(0, 0);
          return;
        }
      
        if (activeSlideIndex > 0) {
          get().goLive(activeItemIndex, activeSlideIndex - 1);
        } else if (activeItemIndex > 0) {
          const prev = activeService.items[activeItemIndex - 1];
          const prevSlideCount = (prev.data?.slides || []).length;
          get().goLive(activeItemIndex - 1, Math.max(0, prevSlideCount - 1));
        } else {
          console.log('[regress] already at the first item');
        }
      },
      
      goLive: (itemIndex, slideIndex = 0) => {
        const { activeService } = get();
        if (!activeService) {
          console.warn('[goLive] no active service');
          return;
        }
        const item = activeService.items[itemIndex];
        if (!item) {
          console.warn('[goLive] no item at index', itemIndex);
          return;
        }
      
        console.log('[goLive]', { itemIndex, slideIndex, itemTitle: item.title, itemType: item.type });
      
        set(s => {
          s.activeItemIndex = itemIndex;
          s.activeSlideIndex = slideIndex;
        });
      
        broadcast('output:go-live', { itemIndex, slideIndex });
      
        import('../services/runner.js').then(({ pushItemToOutput }) => {
          pushItemToOutput(item, slideIndex);
        }).catch(err => console.error('[goLive] pushItemToOutput failed:', err));
      },

    // ── Templates ──
    templates: [],
    setTemplates: (list) =>
      set((s) => {
        s.templates = Array.isArray(list) ? list : [];
      }),

    // ── Services ──
    services: [],
    setServices: (list) =>
      set((s) => {
        s.services = Array.isArray(list) ? list : [];
      }),

    // ── Songs ──
    songs: [],
    setSongs: (list) =>
      set((s) => {
        s.songs = Array.isArray(list) ? list : [];
      }),

    // ── Output / live ──
    liveTemplate: "sermon-default",
    isBlank: false,
    isBlackout: false,

    setLiveTemplate: (id) => {
      set((s) => {
        s.liveTemplate = id;
      });
      broadcast("output:set-template", { id });
    },
    setAltTranslation: (id) => {
      set((s) => {
        s.altTranslation = id;
      });
      broadcast("output:set-alt-translation", { id });
    },
    setAltVerses: (verses) => {
      set((s) => {
        s.altVerses = verses;
      });
      broadcast("output:alt-verses", { verses });
    },
    setNotesText: (text) => {
      set((s) => {
        s.notesText = text;
      });
      broadcast("output:notes-text", { text });
    },
    toggleBlank: () => {
      set((s) => {
        s.isBlank = !s.isBlank;
      });
      broadcast("output:blank", { value: get().isBlank });
    },
    setBlackout: (v) => {
      set((s) => {
        s.isBlackout = v;
      });
      broadcast("output:blackout", { value: v });
    },

    // ── Media ──
    activeMedia: null, // { path, mediaType, name }
    mediaLoop: true,
    mediaMuted: true,

    setActiveMedia: (media) => {
      set((s) => {
        s.activeMedia = media;
      });
      broadcast("output:set-media", { media });
    },
    clearMedia: () => {
      set((s) => {
        s.activeMedia = null;
      });
      broadcast("output:set-media", { media: null });
    },
    setMediaLoop: (v) => {
      set((s) => {
        s.mediaLoop = v;
      });
      broadcast("output:set-media-loop", { value: v });
    },
    setMediaMuted: (v) => {
      set((s) => {
        s.mediaMuted = v;
      });
      broadcast("output:set-media-muted", { value: v });
    },

    // ── Transitions ──
    transitionType: "fade", // 'none' | 'fade' | 'slide-up' | 'zoom'
    transitionDuration: 400, // ms

    setTransitionType: (t) => {
      set((s) => {
        s.transitionType = t;
      });
      broadcast("output:set-transition-type", { value: t });
    },
    setTransitionDuration: (d) => {
      set((s) => {
        s.transitionDuration = d;
      });
      broadcast("output:set-transition-duration", { value: d });
    },
    contentKey: 0,
    bumpContentKey: () =>
      set((s) => {
        s.contentKey = (s.contentKey || 0) + 1;
      }),

    // ── Output window state ──
    outputWindowOpen: false,
    setOutputWindowOpen: (v) =>
      set((s) => {
        s.outputWindowOpen = v;
      }),

    // ── Search ──
    searchResults: [],
    setSearchResults: (rows) =>
      set((s) => {
        s.searchResults = rows;
      }),

    // ── Schedule ──
    currentService: null,
    currentItemIndex: 0,
    setCurrentService: (svc) =>
      set((s) => {
        s.currentService = svc;
        s.currentItemIndex = 0;
      }),
    nextItem: () => {
      const { currentService, currentItemIndex } = get();
      if (!currentService) return;
      const next = Math.min(
        currentItemIndex + 1,
        currentService.items.length - 1
      );
      set((s) => {
        s.currentItemIndex = next;
      });
      broadcast("output:go-to-item", { index: next });
    },
    prevItem: () => {
      const { currentItemIndex } = get();
      const prev = Math.max(currentItemIndex - 1, 0);
      set((s) => {
        s.currentItemIndex = prev;
      });
      broadcast("output:go-to-item", { index: prev });
    },

    // ── Settings ──
    settings: {
      cameraDeviceId: null,
      outputDisplayId: null,
      theme: "dark",
      stageDisplayId: null,
      cameraPeerId: null, // when using a phone as camera
    },
    updateSettings: (patch) =>
      set((s) => {
        Object.assign(s.settings, patch);
      }),
    // ── Service library ──
    services: [],
    setServices: (list) =>
      set((s) => {
        s.services = list;
      }),

    // ── Active service (the one being edited/run) ──
    activeService: null, // { id, name, serviceDate, items: [] }
    activeItemIndex: -1,
    activeSlideIndex: 0,

    setActiveService: (svc) =>
      set((s) => {
        s.activeService = svc;
        s.activeItemIndex = -1;
        s.activeSlideIndex = 0;
      }),

    setServiceItems: (items) =>
      set((s) => {
        if (s.activeService) s.activeService.items = items;
      }),

    // Go live on an item at a specific slide

    songTranspose: 0, // semitones, -11..+11

    setSongTranspose: (v) => {
      const n = Math.max(-11, Math.min(11, v));
      set((s) => {
        s.songTranspose = n;
      });
      broadcast("output:set-song-transpose", { value: n });
    },
    resetSongTranspose: () => {
      set((s) => {
        s.songTranspose = 0;
      });
      broadcast("output:set-song-transpose", { value: 0 });
    },

    // ── Countdown ──
    countdown: {
      running: false,
      durationMs: 5 * 60 * 1000,
      remainingMs: 5 * 60 * 1000,
      startedAt: null,
      label: "",
      showLabel: true,
    },

    setCountdownDuration: (ms) =>
      set((s) => {
        s.countdown.durationMs = ms;
        s.countdown.remainingMs = ms;
        broadcast("output:countdown-state", { ...s.countdown });
      }),
    setCountdownLabel: (text) =>
      set((s) => {
        s.countdown.label = text;
        broadcast("output:countdown-state", { ...s.countdown });
      }),
    startCountdown: () => {
      const now = Date.now();
      set((s) => {
        s.countdown.running = true;
        s.countdown.startedAt = now;
        // if already counted down, restart from full duration
        if (s.countdown.remainingMs <= 0) {
          s.countdown.remainingMs = s.countdown.durationMs;
        }
      });
      broadcast("output:countdown-state", { ...get().countdown });
    },
    pauseCountdown: () =>
      set((s) => {
        s.countdown.running = false;
        s.countdown.remainingMs = Math.max(
          0,
          s.countdown.remainingMs - (Date.now() - s.countdown.startedAt)
        );
        s.countdown.startedAt = null;
        broadcast("output:countdown-state", { ...s.countdown });
      }),
    resetCountdown: () =>
      set((s) => {
        s.countdown.running = false;
        s.countdown.remainingMs = s.countdown.durationMs;
        s.countdown.startedAt = null;
        broadcast("output:countdown-state", { ...s.countdown });
      }),

    // ── Auto-advance ──
    autoAdvance: {
      enabled: false,
      durationSec: 30,
      loopService: false,
    },

    setAutoAdvanceEnabled: (v) =>
      set((s) => {
        s.autoAdvance.enabled = v;
      }),
    setAutoAdvanceDuration: (v) =>
      set((s) => {
        s.autoAdvance.durationSec = Math.max(1, v);
      }),
    setAutoAdvanceLoop: (v) =>
      set((s) => {
        s.autoAdvance.loopService = v;
      }),

  
  }))
);
