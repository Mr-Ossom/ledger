import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

// ─── CL Logo drawn with SVG ──────────────────────────────────────────────────
// C : thick arc (donut), blue gradient, with 3 white bar-chart bars inside
// L : two rects overlapping right side of C, teal-cyan gradient
function CLLogo({ size = 150 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 155 155">
      <Defs>
        <LinearGradient id="cGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1D4ED8" />
          <Stop offset="1" stopColor="#60A5FA" />
        </LinearGradient>
        <LinearGradient id="lGrad" x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor="#06B6D4" />
          <Stop offset="1" stopColor="#14B8A6" />
        </LinearGradient>
      </Defs>

      {/*
        C donut — center (62, 78), outer R=46, inner R=29
        Gap on right side at ±35° from east
          outer upper: (100, 52)   outer lower: (100, 104)
          inner upper: ( 86, 61)   inner lower: ( 86, 95)
      */}
      <Path
        d="M 100 104 A 46 46 0 1 1 100 52 L 86 61 A 29 29 0 1 0 86 95 Z"
        fill="url(#cGrad)"
      />

      {/* Bar chart — 3 ascending white bars inside the C body */}
      <Rect x="37" y="74" width="7" height="12" rx="2" fill="white" opacity="0.92" />
      <Rect x="46" y="65" width="7" height="21" rx="2" fill="white" opacity="0.92" />
      <Rect x="55" y="56" width="7" height="30" rx="2" fill="white" opacity="0.92" />

      {/* L — vertical bar then horizontal base, overlapping C's right gap */}
      <Rect x="97" y="51" width="14" height="55" rx="4" fill="url(#lGrad)" />
      <Rect x="97" y="92" width="42" height="13" rx="4" fill="url(#lGrad)" />
    </Svg>
  );
}

// ─── Animated Splash Screen ───────────────────────────────────────────────────
export default function SplashScreen({ onFinish }) {
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.72)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textY        = useRef(new Animated.Value(18)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo springs into view
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 650, useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1, tension: 48, friction: 7, useNativeDriver: true,
        }),
      ]),
      Animated.delay(180),
      // 2. App name slides up & fades in
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1, duration: 450, useNativeDriver: true,
        }),
        Animated.timing(textY, {
          toValue: 0, duration: 450, useNativeDriver: true,
        }),
      ]),
      Animated.delay(120),
      // 3. Tagline fades in
      Animated.timing(tagOpacity, {
        toValue: 1, duration: 450, useNativeDriver: true,
      }),
      // 4. Hold
      Animated.delay(950),
      // 5. Fade out the whole screen
      Animated.timing(screenOpacity, {
        toValue: 0, duration: 380, useNativeDriver: true,
      }),
    ]).start(() => onFinish?.());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Subtle radial blue glow behind logo */}
      <View style={styles.glow} />

      {/* Logo */}
      <Animated.View style={{
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }}>
        <CLLogo size={152} />
      </Animated.View>

      {/* App name */}
      <Animated.View style={[
        styles.nameRow,
        { opacity: textOpacity, transform: [{ translateY: textY }] },
      ]}>
        <Text style={styles.nameCore}>Core</Text>
        <Text style={styles.nameLedger}>Ledger</Text>
      </Animated.View>

      {/* Divider + tagline */}
      <Animated.View style={[styles.taglineWrap, { opacity: tagOpacity }]}>
        <View style={styles.divider} />
        <Text style={styles.tagline}>
          Clear Records. Stronger Business. Brighter Future.
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050E1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(29,78,216,0.13)',
    top: '50%',
    left: '50%',
    marginTop: -220,
    marginLeft: -150,
  },
  nameRow: {
    flexDirection: 'row',
    marginTop: 28,
  },
  nameCore: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  nameLedger: {
    color: '#06B6D4',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  taglineWrap: {
    alignItems: 'center',
    marginTop: 16,
  },
  divider: {
    width: 52,
    height: 2.5,
    backgroundColor: '#1D4ED8',
    borderRadius: 2,
    marginBottom: 14,
  },
  tagline: {
    color: 'rgba(148,163,184,0.85)',
    fontSize: 12.5,
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingHorizontal: 36,
    lineHeight: 19,
  },
});
