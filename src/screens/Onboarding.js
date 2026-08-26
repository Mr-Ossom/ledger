import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { COLORS, STRINGS } from '../constants';
import { useAuth } from '../context/AuthContext';

const lang = 'en';
const t = STRINGS[lang];
const SLIDES = [
  { id: '1', icon: '₵', title: t.onboarding1Title, desc: t.onboarding1Desc },
  { id: '2', icon: '🎙️', title: t.onboarding2Title, desc: t.onboarding2Desc },
  { id: '3', icon: '📈', title: t.onboarding3Title, desc: t.onboarding3Desc },
];

export default function OnboardingScreen({ navigation }) {
  const { completeOnboarding } = useAuth();
  const [index, setIndex] = useState(0);
  const [slideWidth, setSlideWidth] = useState(Dimensions.get('window').width);
  const ref = useRef(null);

  const goNext = async () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      ref.current?.scrollTo({ x: next * slideWidth, animated: true });
      setIndex(next);
    } else {
      await completeOnboarding();
      navigation.replace('SignIn');
    }
  };
  const skip = async () => { await completeOnboarding(); navigation.replace('SignIn'); };

  const onScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / slideWidth);
    if (i !== index) setIndex(i);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={skip} style={styles.skip}>
        <Text style={styles.skipText}>{t.skip}</Text>
      </TouchableOpacity>

      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        style={{ flex: 1 }}
        onLayout={(e) => setSlideWidth(e.nativeEvent.layout.width)}
      >
        {SLIDES.map((item) => (
          <View key={item.id} style={[styles.slide, { width: slideWidth }]}>
            <View style={styles.iconCircle}><Text style={styles.icon}>{item.icon}</Text></View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primary} onPress={goNext}>
          <Text style={styles.primaryText}>{index === SLIDES.length - 1 ? t.getStarted : t.next}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Offline-first • Built for Ghana</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  skip: { alignSelf: 'flex-end', padding: 20, paddingTop: 50 },
  skipText: { color: COLORS.muted, fontWeight: '600' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 40 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  icon: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.navy, textAlign: 'center', marginBottom: 12 },
  desc: { fontSize: 16, color: COLORS.muted, textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.lightGray },
  dotActive: { backgroundColor: COLORS.gold, width: 24 },
  footer: { padding: 24, paddingBottom: 36 },
  primary: { backgroundColor: COLORS.gold, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: COLORS.navy, fontSize: 17, fontWeight: '800' },
  hint: { textAlign: 'center', color: COLORS.muted, marginTop: 14, fontSize: 12 },
});
