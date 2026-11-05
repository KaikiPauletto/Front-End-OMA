import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const creators = [
  'Eduardo Pagliarini Herter',
  'Guilherme Vassoler Daros',
  'Kaiki André Pauletto',
  'Luis Eduardo Brescansin Canal',
];

export function AboutOMAScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para a loja"
          hitSlop={10}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Conheça a OMA</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Ionicons name="cafe-outline" size={32} color={colors.clayLight} />
          <Text style={styles.eyebrow}>NOSSA HISTÓRIA</Text>
          <Text style={styles.title}>Um bom mate sempre aproxima.</Text>
        </View>

        <Text style={styles.paragraph}>
          Tudo começou com quatro alunos gaudérios que tinham algo em comum: a
          paixão por um bom mate. Todas as noites, entre aulas, trabalhos e
          aquela prosa de faculdade, a cuia estava sempre por perto. Foi dessa
          tradição tão nossa que surgiu uma ideia: por que não facilitar a vida
          de quem também não dispensa um chimarrão?
        </Text>
        <Text style={styles.paragraph}>
          A gente sabe que encontrar aquela cuia especial nem sempre é barbada!
          Muitas vezes, é preciso percorrer diversas lojas e páginas para
          comparar modelos, preços e acessórios. Pensando nisso, decidimos
          criar um espaço que reúne tudo o que o bom mateador precisa em um só
          lugar, trazendo mais praticidade na hora de escolher seu próximo
          companheiro de roda.
        </Text>
        <Text style={styles.paragraph}>
          Mais do que um e-commerce, queremos valorizar a cultura gaúcha e
          manter viva uma tradição que passa de geração em geração. Afinal, não
          importa se é na faculdade, no trabalho ou no galpão: sempre tem espaço
          para mais um mate!
        </Text>

        <View style={styles.quoteCard}>
          <Text style={styles.quote}>
            “Um mate bagual começa com a escolha certa!”
          </Text>
        </View>

        <View style={styles.creatorsSection}>
          <Text style={styles.sectionTitle}>Quem criou a OMA</Text>
          <Text style={styles.sectionDescription}>
            Quatro alunos unidos pela paixão pelo mate e pela vontade de
            facilitar essa tradição.
          </Text>
          <View style={styles.creatorsList}>
            {creators.map((creator, index) => (
              <View key={creator} style={styles.creatorCard}>
                <View style={styles.creatorNumber}>
                  <Text style={styles.creatorNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.creatorName}>{creator}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.editorial },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontFamily: typography.family.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
  },
  headerSpacer: { width: 40 },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  intro: { alignItems: 'center', marginBottom: 25 },
  eyebrow: {
    color: colors.clayLight,
    fontFamily: typography.family.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    marginTop: 12,
  },
  title: {
    color: colors.white,
    fontFamily: typography.family.display,
    fontSize: 28,
    textAlign: 'center',
    marginTop: 8,
  },
  paragraph: {
    color: colors.white,
    fontFamily: typography.family.body,
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 17,
  },
  quoteCard: {
    padding: 20,
    marginTop: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 22, 12, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  quote: {
    color: colors.clayLight,
    fontFamily: typography.family.display,
    fontSize: 19,
    lineHeight: 27,
    textAlign: 'center',
  },
  creatorsSection: { marginTop: 32 },
  sectionTitle: {
    color: colors.white,
    fontFamily: typography.family.display,
    fontSize: 24,
    textAlign: 'center',
  },
  sectionDescription: {
    color: colors.clayLight,
    fontFamily: typography.family.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 17,
  },
  creatorsList: { gap: 10 },
  creatorCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  creatorNumber: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.clayLight,
  },
  creatorNumberText: {
    color: colors.editorial,
    fontFamily: typography.family.bodyMedium,
    fontSize: 13,
    fontWeight: '700',
  },
  creatorName: {
    flex: 1,
    color: colors.white,
    fontFamily: typography.family.bodyMedium,
    fontSize: 13,
    marginLeft: 12,
  },
});
