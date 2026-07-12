import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import SafePressable from '../components/SafePressable';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { useAppStore } from '../store/appStore';
import { RootStackParamList } from '../navigation/routes';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';

export default function LandingScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Landing'>) {
	const setRole = useAppStore(s => s.setSelectedRole);
	const [taps, setTaps] = useState(0);
	function begin(role: 'ORGANIZER' | 'FAMILY_MEMBER' | 'SUPER_ADMIN') {
		setRole(role);
		navigation.navigate('AuthChoice', { role });
	}

	return (
		<Screen>
			<View style={styles.container}>
				{/* Header Section */}
				<SafePressable
					onPress={() => {
						const n = taps + 1;
						setTaps(n);
						if (n >= 7) navigation.navigate('Login', { role: 'SUPER_ADMIN' } as any);
					}}
					style={styles.headerPressable}
				>
					<Text style={styles.title}>Funeral Management</Text>
					<Text style={styles.titleHighlight}>System</Text>
					</SafePressable>

				<Text style={styles.subtitle}>
					Beautiful, secure planning with payments, documents, donations and family support in one elegant mobile app.
				</Text>

				{/* Hero Section */}
				<View style={styles.hero}>
					{/* Gradient Overlay */}
					<View style={styles.heroBadgeContainer}>
						<View style={styles.badge}>
							<Text style={styles.badgeText}>✨ Enterprise Ready</Text>
						</View>
					</View>

					<View style={styles.heroContent}>
						<Text style={styles.heroTitle}>Plan with Dignity</Text>
						<Text style={styles.heroSubtitle}>Track every detail. Support your family.</Text>
					</View>
				<View style={styles.heroButtons}>
					<Button
						title="I am with an Organizer"
						onPress={() => navigation.navigate('OrganizerEntry')}
						size="lg"
						style={styles.heroButton}
					/>
					<Button
						title="I am an Organizer"
						variant="secondary"
						onPress={() => begin('ORGANIZER')}
						size="lg"
						style={styles.heroButton}
					/>
				</View>
					{/* Feature Pills */}
					<View style={styles.featuresGrid}>
						<View style={styles.featureCard}>
							<Text style={styles.featureEmoji}>🔐</Text>
							<Text style={styles.featureLabel}>Secure Vault</Text>
						</View>
						<View style={styles.featureCard}>
							<Text style={styles.featureEmoji}>💳</Text>
							<Text style={styles.featureLabel}>Verified Payments</Text>
						</View>
					</View>
				</View>

				{/* Role Selection Section */}
				<View style={styles.rolesSection}>
					<Text style={styles.sectionTitle}>Choose Your Role</Text>
					
					<SafePressable
						style={({ pressed }: any) => [
							styles.roleCard,
							styles.organizerCard,
							pressed && styles.cardPressed,
						]}
						onPress={() => begin('ORGANIZER')}
					>
						<Text style={styles.roleEmoji}>👔</Text>
						<Text style={styles.roleName}>Organizer</Text>
						<Text style={styles.roleDescription}>
							Manage services, payments, and client relationships
						</Text>
						<View style={styles.cardFooter}>
							<Text style={styles.arrowIcon}>→</Text>
						</View>
					</SafePressable>

					<SafePressable
						style={({ pressed }: any) => [
							styles.roleCard,
							styles.familyCard,
							pressed && styles.cardPressed,
						]}
						onPress={() => begin('FAMILY_MEMBER')}
					>
						<Text style={styles.roleEmoji}>❤️</Text>
						<Text style={styles.roleName}>Family Member</Text>
						<Text style={styles.roleDescription}>
							Honor, plan, and celebrate with support
						</Text>
						<View style={styles.cardFooter}>
							<Text style={styles.arrowIcon}>→</Text>
						</View>
					</SafePressable>
				</View>

				{/* Trust Badges */}
				<View style={styles.trustSection}>
					<Text style={styles.trustLabel}>Trusted by families and organizers</Text>
					<View style={styles.trustBadges}>
						<View style={styles.trustBadge}>
							<Text style={styles.trustIcon}>🛡️</Text>
							<Text style={styles.trustText}>Secure</Text>
						</View>
						<View style={styles.trustBadge}>
							<Text style={styles.trustIcon}>✅</Text>
							<Text style={styles.trustText}>Verified</Text>
						</View>
						<View style={styles.trustBadge}>
							<Text style={styles.trustIcon}>⚡</Text>
							<Text style={styles.trustText}>Fast</Text>
						</View>
					</View>
				</View>
			</View>

		</Screen>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},

	// Header
	headerPressable: {
		marginBottom: spacing.md,
	},

	title: {
		fontSize: typography.sizes['4xl'],
		fontWeight: typography.weights.black,
		color: colors.text.primary,
		lineHeight: 42,
	},

	titleHighlight: {
		fontSize: typography.sizes['4xl'],
		fontWeight: typography.weights.black,
		color: colors.primary.light,
		lineHeight: 42,
	},

	subtitle: {
		marginTop: spacing.md,
		marginBottom: spacing.lg,
		color: colors.text.secondary,
		fontSize: typography.sizes.base,
		lineHeight: 24,
	},

	// Hero Section
	hero: {
		backgroundColor: colors.neutral[800],
		borderRadius: radius.xl,
		padding: spacing.xl,
		marginVertical: spacing.lg,
		...shadows.lg,
	},

	heroBadgeContainer: {
		marginBottom: spacing.md,
	},

	badge: {
		backgroundColor: colors.warning,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		borderRadius: radius.full,
		alignSelf: 'flex-start',
	},

	badgeText: {
		color: colors.neutral.white,
		fontSize: typography.sizes.xs,
		fontWeight: typography.weights.bold,
	},

	heroContent: {
		marginBottom: spacing.lg,
	},

	heroButtons: {
		flexDirection: 'row',
		gap: spacing.md,
		marginBottom: spacing.lg,
	},

	heroButton: {
		flex: 1,
	},

	heroTitle: {
		fontSize: typography.sizes['3xl'],
		fontWeight: typography.weights.black,
		color: colors.neutral.white,
		lineHeight: 36,
	},

	heroSubtitle: {
		fontSize: typography.sizes.base,
		color: colors.neutral[200],
		marginTop: spacing.sm,
		lineHeight: 24,
	},

	featuresGrid: {
		flexDirection: 'row',
		gap: spacing.md,
	},

	featureCard: {
		flex: 1,
		backgroundColor: 'rgba(255,255,255,0.1)',
		borderRadius: radius.lg,
		padding: spacing.md,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.2)',
	},

	featureEmoji: {
		fontSize: 24,
		marginBottom: spacing.sm,
	},

	featureLabel: {
		color: colors.neutral.white,
		fontSize: typography.sizes.sm,
		fontWeight: typography.weights.semibold,
		textAlign: 'center',
	},

	// Roles Section
	rolesSection: {
		marginVertical: spacing.xl,
	},

	sectionTitle: {
		fontSize: typography.sizes.xl,
		fontWeight: typography.weights.bold,
		color: colors.text.primary,
		marginBottom: spacing.lg,
	},

	collectorForm: {
		backgroundColor: colors.background.primary,
		padding: spacing.md,
		borderRadius: radius.lg,
		marginTop: spacing.md,
		borderWidth: 1,
		borderColor: colors.border.light,
	},

	roleCard: {
		backgroundColor: colors.background.primary,
		borderRadius: radius.xl,
		padding: spacing.lg,
		marginBottom: spacing.md,
		borderWidth: 1.5,
		borderColor: colors.border.light,
		...shadows.md,
	},

	organizerCard: {
		borderColor: colors.secondary.light,
	},

	familyCard: {
		borderColor: colors.success,
	},

	cardPressed: {
		opacity: 0.8,
		transform: [{ scale: 0.98 }],
	},

	roleEmoji: {
		fontSize: 40,
		marginBottom: spacing.md,
	},

	roleName: {
		fontSize: typography.sizes.xl,
		fontWeight: typography.weights.bold,
		color: colors.text.primary,
		marginBottom: spacing.sm,
	},

	roleDescription: {
		fontSize: typography.sizes.sm,
		color: colors.text.secondary,
		lineHeight: 20,
		marginBottom: spacing.md,
	},

	cardFooter: {
		alignItems: 'flex-end',
	},

	arrowIcon: {
		fontSize: typography.sizes.xl,
		color: colors.primary.light,
	},

	// Trust Section
	trustSection: {
		marginTop: spacing.xl,
		marginBottom: spacing.xl,
		alignItems: 'center',
	},

	trustLabel: {
		fontSize: typography.sizes.sm,
		color: colors.text.secondary,
		marginBottom: spacing.md,
	},

	trustBadges: {
		flexDirection: 'row',
		gap: spacing.md,
	},

	trustBadge: {
		alignItems: 'center',
		flex: 1,
	},

	trustIcon: {
		fontSize: 24,
		marginBottom: spacing.xs,
	},

	trustText: {
		fontSize: typography.sizes.xs,
		color: colors.text.secondary,
		fontWeight: typography.weights.medium,
	},
});
