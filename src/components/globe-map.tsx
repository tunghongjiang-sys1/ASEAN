import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { getCategoryColor } from '../constants/colors';
import { globeHtml } from '../constants/globe-html';
import type { Place, UserLocation } from '../types/place';

type Props = {
  places: Place[];
  userLocation?: UserLocation | null;
  selectedPlace?: Place | null;
  split?: boolean;
  onSelect: (id: string) => void;
  onReady?: () => void;
  onPlaneDone?: () => void;
  flyRoute?: { from: { lat: number; lng: number }; to: { lat: number; lng: number }; color: string } | null;
};

export function GlobeMap({
  places,
  userLocation,
  selectedPlace,
  split,
  onSelect,
  onReady,
  onPlaneDone,
  flyRoute,
}: Props) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);

  const send = useCallback((type: string, payload?: unknown) => {
    const msg = JSON.stringify({ type, payload });
    if (Platform.OS === 'web') {
      const iframe = document.getElementById('globe-frame') as HTMLIFrameElement | null;
      iframe?.contentWindow?.postMessage(msg, '*');
      return;
    }
    ref.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(msg)} })); true;`
    );
  }, []);

  const pushPlaces = useCallback(() => {
    send(
      'setPlaces',
      places.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        location: p.location,
        color: getCategoryColor(p.category),
      }))
    );
  }, [places, send]);

  useEffect(() => {
    pushPlaces();
  }, [pushPlaces]);

  const [readyTimedOut, setReadyTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReadyTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (readyTimedOut) pushPlaces();
  }, [readyTimedOut, pushPlaces]);

  useEffect(() => {
    if (!ready.current || !userLocation) return;
    send('setUser', userLocation);
  }, [userLocation, send]);

  useEffect(() => {
    if (!ready.current || !selectedPlace) return;
    send('focus', { place: selectedPlace, split: !!split });
  }, [selectedPlace, split, send]);

  useEffect(() => {
    if (!ready.current || !flyRoute) return;
    send('flyPlane', flyRoute);
  }, [flyRoute, send]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'ready') {
        ready.current = true;
        pushPlaces();
        if (userLocation) send('setUser', userLocation);
        onReady?.();
      }
      if (data.type === 'select') onSelect(data.payload.id);
      if (data.type === 'planeDone') onPlaneDone?.();
    } catch {}
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (ev: MessageEvent) => {
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (data?.type === 'ready') {
          ready.current = true;
          pushPlaces();
          if (userLocation) send('setUser', userLocation);
          onReady?.();
        }
        if (data?.type === 'select') onSelect(data.payload.id);
        if (data?.type === 'planeDone') onPlaneDone?.();
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSelect, onPlaneDone, onReady, pushPlaces, send, userLocation]);

  if (Platform.OS === 'web') {
    const srcDoc = globeHtml;
    return (
      <View style={styles.wrap}>
        <iframe
          id="globe-frame"
          title="globe"
          srcDoc={srcDoc}
          style={{ border: 'none', width: '100%', height: '100%' }}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html: globeHtml, baseUrl: 'https://unpkg.com' }}
        onMessage={onMessage}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        allowFileAccess
        allowUniversalAccessFromFileURLs
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden', backgroundColor: '#0a0a2e' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
