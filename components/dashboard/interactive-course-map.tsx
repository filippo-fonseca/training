"use client";

/**
 * The expanded-overlay course map: an INTERACTIVE Google Maps JS map drawing the
 * baked OSM loop as a Polyline with START/FINISH and bridge markers. The Maps
 * JavaScript API script is injected lazily the first time this mounts (i.e. when
 * the overlay opens) and only when a key exists. If the key is missing or the
 * script fails to load, we render the self-contained OSM SVG instead, so the
 * page degrades gracefully and the keyless build never calls out.
 */
import { useEffect, useRef, useState } from "react";
import { CourseSvg } from "./course-svg";
import {
  ACCENT_HEX,
  MAP_STYLE_JS,
  landmarkLatLng,
  mapsApiKey,
  routeLatLng,
} from "./course-map-config";

declare global {
  // eslint-disable-next-line no-var
  interface Window {
    google?: any;
  }
}

const BOOTSTRAP_ID = "google-maps-bootstrap";
let loaderPromise: Promise<any> | null = null;

// Google's OFFICIAL inline bootstrap loader (the documented "dynamic library
// import" IIFE). Unlike a plain script-src injection, this defines
// google.maps.importLibrary SYNCHRONOUSLY, before any network fetch: the moment
// this inline script executes on insertion, importLibrary is a callable stub
// that lazily loads the real API on first use. That removes the race where the
// namespace was probed at script `onload` but the async bootstrap had not yet
// run. The IIFE is invoked with { key, v } supplied below.
const GOOGLE_MAPS_BOOTSTRAP =
  '(g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})';

/**
 * Inject the official inline bootstrap once and resolve with google.maps ONLY
 * after the libraries we use have been imported. The bootstrap installs
 * google.maps.importLibrary synchronously on insertion, so we can immediately
 * call it. We await the `maps` library (Map, Polyline, LatLngBounds,
 * SymbolPath) and the `marker` library (Marker) so callers can construct
 * everything synchronously once this resolves. Those awaits populate the
 * google.maps namespace, so we resolve with window.google.maps. On any failure
 * (bootstrap throw, importLibrary rejection) we clear the memoized promise so a
 * later overlay open can retry.
 */
function loadGoogleMaps(key: string): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<any>((resolve, reject) => {
    try {
      if (!window.google?.maps?.importLibrary) {
        const config = JSON.stringify({ key, v: "weekly" });
        const s = document.createElement("script");
        s.id = BOOTSTRAP_ID;
        // Inline script: executes synchronously on insertion, defining
        // google.maps.importLibrary before we call it just below.
        s.text = GOOGLE_MAPS_BOOTSTRAP + "(" + config + ");";
        document.head.appendChild(s);
      }
      const importLibrary = window.google?.maps?.importLibrary;
      if (!importLibrary) throw new Error("maps importLibrary unavailable");
      // Import the libraries whose classes we construct below, then hand back
      // the now-populated google.maps namespace.
      Promise.all([importLibrary("maps"), importLibrary("marker")])
        .then(() => resolve(window.google.maps))
        .catch(reject);
    } catch (err) {
      reject(err);
    }
  }).catch((err) => {
    loaderPromise = null;
    throw err;
  });
  return loaderPromise;
}

export function InteractiveCourseMap({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mapsApiKey || !landmarkLatLng || routeLatLng.length === 0) {
      setFailed(true);
      return;
    }
    const lm = landmarkLatLng;
    let cancelled = false;
    let map: any = null;
    const overlays: any[] = [];

    loadGoogleMaps(mapsApiKey)
      .then((maps) => {
        if (cancelled || !ref.current || !maps) return;
        map = new maps.Map(ref.current, {
          styles: MAP_STYLE_JS,
          backgroundColor: "#0e1116",
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });

        const path = routeLatLng.map(([lat, lng]) => ({ lat, lng }));
        overlays.push(
          new maps.Polyline({
            path,
            strokeColor: "#" + ACCENT_HEX,
            strokeOpacity: 0.95,
            strokeWeight: 4,
            map,
          }),
        );

        const bounds = new maps.LatLngBounds();
        path.forEach((p: { lat: number; lng: number }) => bounds.extend(p));
        map.fitBounds(bounds, 28);

        const dot = (color: string, r: number) => ({
          path: maps.SymbolPath.CIRCLE,
          scale: r,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#0e1116",
          strokeWeight: 2,
        });
        const marker = (
          latlng: [number, number],
          title: string,
          color: string,
          r: number,
        ) =>
          new maps.Marker({
            position: { lat: latlng[0], lng: latlng[1] },
            map,
            title,
            icon: dot(color, r),
          });

        overlays.push(
          marker(lm.start, "Start / Finish", "#" + ACCENT_HEX, 7),
          marker(lm.rourke, "Rourke Bridge", "#8fd8ea", 5),
          marker(lm.aiken, "Aiken Street Bridge", "#8fd8ea", 5),
        );
      })
      .catch((err) => {
        // Clear the memoized loader so a later overlay open can retry, even
        // when the failure was a construction throw after a successful load.
        loaderPromise = null;
        console.error(
          "[course-map] interactive map failed, falling back to SVG:",
          err,
        );
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      for (const o of overlays) o?.setMap?.(null);
      if (map && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(map);
      }
      map = null;
      if (ref.current) ref.current.innerHTML = "";
    };
  }, []);

  if (failed) {
    return (
      <div className="rounded-sd-card border border-sd-line bg-sd-darker-box/50 p-4">
        <CourseSvg className="h-auto w-full" variant="detail" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      role="img"
      aria-label="Interactive map of the Baystate Half Marathon course in Lowell, Massachusetts: a loop run twice along the Merrimack River, crossing the Rourke Bridge and the Aiken Street Bridge, starting and finishing by the Tsongas Center."
    />
  );
}
