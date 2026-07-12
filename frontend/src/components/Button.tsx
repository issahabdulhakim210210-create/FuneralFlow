import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import SafePressable from './SafePressable';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';

interface ButtonProps extends TouchableOpacityProps {
	title: string;
	onPress?: () => void;
	variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
	loading?: boolean;
	style?: ViewStyle;
	textStyle?: TextStyle;
	size?: 'sm' | 'md' | 'lg';
}

export function Button({
	title,
	onPress,
	variant = 'primary',
	loading = false,
	style,
	textStyle,
	size = 'md',
	...props
}: ButtonProps) {
	return (
		<SafePressable
			onPress={onPress}
			disabled={loading}
			style={({ pressed }: any) => [
				styles.button,
				styles[`size_${size}`],
				styles[variant],
				pressed && styles.pressed,
				style,
			]}
			{...props}
		>
			{loading ? (
				<ActivityIndicator
					color={
						variant === 'ghost' || variant === 'secondary'
							? colors.primary.base
							: colors.neutral.white
					}
				/>
			) : (
				<Text style={[
					styles.text,
					styles[`text_${variant}`],
					styles[`textSize_${size}`],
					textStyle,
				]}>
					{title}
				</Text>
			)}
		</SafePressable>
	);
}

const styles = StyleSheet.create({
	button: {
		borderRadius: radius.xl,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 3,
	},

	size_sm: {
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	size_md: {
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.lg,
	},
	size_lg: {
		paddingVertical: spacing.lg,
		paddingHorizontal: spacing.xl,
	},

	primary: {
		backgroundColor: colors.primary.base,
		...shadows.sm,
	},
	secondary: {
		backgroundColor: colors.neutral[100],
		borderWidth: 1,
		borderColor: colors.border.light,
	},
	danger: {
		backgroundColor: colors.error,
	},
	ghost: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: colors.neutral[300],
	},

	pressed: {
		opacity: 0.85,
		transform: [{ scale: 0.98 }],
	},

	text: {
		fontWeight: typography.weights.semibold,
		textAlign: 'center',
	},
	textSize_sm: {
		fontSize: typography.sizes.sm,
	},
	textSize_md: {
		fontSize: typography.sizes.base,
	},
	textSize_lg: {
		fontSize: typography.sizes.lg,
	},
	text_primary: {
		color: colors.neutral.white,
	},
	text_secondary: {
		color: colors.text.primary,
	},
	text_danger: {
		color: colors.neutral.white,
	},
	text_ghost: {
		color: colors.text.primary,
	},
});
