import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function EditorialSection({ onLearnMore }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nossas Raízes</Text>
      <Text style={styles.description}>
        Tradição passada de geração em geração. Descubra a história por trás de cada cuia e a paixão que move o nosso mate.
      </Text>
      <View style={styles.photoPlaceholder}>
        <Image
          source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Mate_gaucho.jpg' }}
          style={styles.editorialImage}
          resizeMode="cover"
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onLearnMore}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Conheça a OMA</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 610,
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 64,
    alignItems: 'center',
    backgroundColor: colors.editorial,
  },
  title: {
    color: colors.white,
    fontFamily: typography.family.display,
    fontSize: 23,
    fontWeight: '400',
    marginBottom: 16,
  },
  description: {
    maxWidth: 350,
    color: colors.clayLight,
    fontFamily: typography.family.body,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 32,
  },
  photoPlaceholder: {
    width: 320,
    height: 256,
    maxWidth: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(30, 22, 12, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  editorialImage: { width: '100%', height: '100%' },
  button: {
    minHeight: 50,
    paddingHorizontal: 25,
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: {
    color: colors.white,
    fontFamily: typography.family.body,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
