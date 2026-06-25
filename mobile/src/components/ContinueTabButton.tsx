import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProgress } from '../state/progress';
import { PATHS } from '../data/paths';
import { MainStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function ContinueTabButton() {
  const navigation = useNavigation<Nav>();
  const { progress } = useProgress();

  const handlePress = () => {
    const { lastAccessed, activePaths } = progress;

    // If we have a last accessed book, jump straight there
    if (lastAccessed) {
      navigation.navigate('Reader', { bookId: lastAccessed.bookId });
      return;
    }

    // Otherwise go to the first enrolled path's first module
    if (activePaths.length > 0) {
      const path = PATHS.find(p => p.id === activePaths[0]);
      if (path && path.modules.length > 0) {
        navigation.navigate('ModuleDetail', {
          pathId: path.id,
          moduleId: path.modules[0].id,
        });
        return;
      }
    }

    // Nothing to continue — go to Explore
    navigation.navigate('Tabs');
  };

  const hasContent = !!(progress.lastAccessed || progress.activePaths.length > 0);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.btn, !hasContent && styles.btnDim]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Ionicons name="play" size={20} color="#FFFFFF" />
        <Text style={styles.label}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  btn: {
    backgroundColor: '#7C3AED',
    borderRadius: 32,
    paddingHorizontal: 18,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 6,
  },
  btnDim: { opacity: 0.5 },
  label: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
