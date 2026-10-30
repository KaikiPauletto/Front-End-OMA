import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function ProductImage({ source, style, fallbackEmoji = '🧉', resizeMode = 'contain', accessibilityLabel }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [source?.uri]);

  if (!source?.uri || imageFailed) {
    return (
      <View style={[styles.fallback, style]} accessibilityLabel={accessibilityLabel}>
        <Text style={styles.emoji}>{fallbackEmoji}</Text>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onError={() => setImageFailed(true)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  emoji: { fontSize: 56 },
});
