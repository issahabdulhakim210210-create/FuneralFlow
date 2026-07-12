import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radius, shadows, spacing } from '../theme/colors';

interface CardProps extends ViewProps {
	children: React.ReactNode;
	style?: ViewProps['style'];
	variant?: 'default' | 'elevated' | 'filled';
}

export const Card = ({ children, style, variant = 'default', ...props }: CardProps) => (
	<View style={[
		styles.card,
		styles[`variant_${variant}`],
		style,
	]} {...props}>
		{children}
	</View>
);

const styles = StyleSheet.create({
	card: {
		borderRadius: radius.lg,
		padding: spacing.lg,
		marginBottom: spacing.lg,
	},

	variant_default: {
		backgroundColor: colors.neutral.white,
		borderWidth: 1,
		borderColor: colors.neutral[200],
		...shadows.sm,
	},

	variant_elevated: {
		backgroundColor: colors.neutral.white,
		...shadows.md,
	},

	variant_filled: {
		backgroundColor: colors.neutral[50],
		borderWidth: 1,
		borderColor: colors.neutral[200],
	},
});
