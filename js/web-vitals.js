// Web Vitals Performance Monitoring
// Tracks Core Web Vitals: LCP, FID, CLS, FCP, TTFB

(function () {
  "use strict";

  // Performance metrics storage
  const metrics = {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
  };

  // Send metric to analytics
  const sendToAnalytics = (metric) => {
    console.log("[Web Vitals]", metric.name, metric.value);

    // Send to Google Analytics if available
    if (window.gtag) {
      gtag("event", metric.name, {
        event_category: "Web Vitals",
        value: Math.round(
          metric.name === "CLS" ? metric.value * 1000 : metric.value
        ),
        event_label: metric.id,
        non_interaction: true,
      });
    }

    // Store in localStorage for stats command
    try {
      const storedMetrics = JSON.parse(
        localStorage.getItem("webVitals") || "{}"
      );
      storedMetrics[metric.name] = {
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
      };
      localStorage.setItem("webVitals", JSON.stringify(storedMetrics));
    } catch (error) {
      console.warn("[Web Vitals] Could not store metrics:", error);
    }
  };

  // Largest Contentful Paint (LCP)
  const observeLCP = () => {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        const value = lastEntry.renderTime || lastEntry.loadTime;
        const rating =
          value < 2500 ? "good" : value < 4000 ? "needs-improvement" : "poor";

        metrics.lcp = { value, rating };
        sendToAnalytics({ name: "LCP", value, rating, id: "v1" });
      });

      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch (error) {
      console.warn("[Web Vitals] LCP not supported:", error);
    }
  };

  // First Input Delay (FID)
  const observeFID = () => {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry) => {
          const value = entry.processingStart - entry.startTime;
          const rating =
            value < 100 ? "good" : value < 300 ? "needs-improvement" : "poor";

          metrics.fid = { value, rating };
          sendToAnalytics({ name: "FID", value, rating, id: "v1" });
        });
      });

      observer.observe({ type: "first-input", buffered: true });
    } catch (error) {
      console.warn("[Web Vitals] FID not supported:", error);
    }
  };

  // Cumulative Layout Shift (CLS)
  const observeCLS = () => {
    try {
      let clsValue = 0;
      let clsEntries = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        }
      });

      observer.observe({ type: "layout-shift", buffered: true });

      // Report CLS on page unload
      addEventListener(
        "visibilitychange",
        () => {
          if (document.visibilityState === "hidden") {
            const rating =
              clsValue < 0.1
                ? "good"
                : clsValue < 0.25
                ? "needs-improvement"
                : "poor";
            metrics.cls = { value: clsValue, rating };
            sendToAnalytics({ name: "CLS", value: clsValue, rating, id: "v1" });
          }
        },
        { once: true }
      );
    } catch (error) {
      console.warn("[Web Vitals] CLS not supported:", error);
    }
  };

  // First Contentful Paint (FCP)
  const observeFCP = () => {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(
          (entry) => entry.name === "first-contentful-paint"
        );

        if (fcpEntry) {
          const value = fcpEntry.startTime;
          const rating =
            value < 1800 ? "good" : value < 3000 ? "needs-improvement" : "poor";

          metrics.fcp = { value, rating };
          sendToAnalytics({ name: "FCP", value, rating, id: "v1" });
        }
      });

      observer.observe({ type: "paint", buffered: true });
    } catch (error) {
      console.warn("[Web Vitals] FCP not supported:", error);
    }
  };

  // Time to First Byte (TTFB)
  const observeTTFB = () => {
    try {
      const navEntry = performance.getEntriesByType("navigation")[0];

      if (navEntry) {
        const value = navEntry.responseStart - navEntry.requestStart;
        const rating =
          value < 800 ? "good" : value < 1800 ? "needs-improvement" : "poor";

        metrics.ttfb = { value, rating };
        sendToAnalytics({ name: "TTFB", value, rating, id: "v1" });
      }
    } catch (error) {
      console.warn("[Web Vitals] TTFB not available:", error);
    }
  };

  // Initialize all observers
  if ("PerformanceObserver" in window) {
    observeLCP();
    observeFID();
    observeCLS();
    observeFCP();
    observeTTFB();

    console.log("[Web Vitals] Monitoring initialized");
  } else {
    console.warn("[Web Vitals] PerformanceObserver not supported");
  }

  // Expose metrics for debugging
  window.__webVitals = metrics;
})();
