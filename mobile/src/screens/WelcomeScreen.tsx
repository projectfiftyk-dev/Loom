import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../App';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

const C = {
  bg: '#0C0B1A',
  surface: '#1E1C30',
  text: '#FFFFFF',
  textMuted: '#8B87B8',
  accent: '#7C3AED',
};

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.logo}>📖</Text>
        <Text style={styles.appName}>Loom</Text>
        <Text style={styles.tagline}>Stories that teach. Worlds that stick.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Auth', { mode: 'register' })}>
          <Text style={styles.btnPrimaryText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Auth', { mode: 'login' })}>
          <Text style={styles.btnSecondaryText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Goal')}>
          <Text style={styles.btnGhostText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, justifyContent: 'space-between', paddingVertical: 48 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  logo: { fontSize: 72 },
  appName: { fontSize: 42, fontWeight: '700', color: C.text, letterSpacing: 1 },
  tagline: { fontSize: 16, color: C.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  actions: { gap: 12, paddingHorizontal: 24 },
  btnPrimary: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
  },
  btnSecondaryText: { color: C.text, fontSize: 16, fontWeight: '600' },
  btnGhost: { paddingVertical: 12, alignItems: 'center' },
  btnGhostText: { color: C.textMuted, fontSize: 15 },
});
