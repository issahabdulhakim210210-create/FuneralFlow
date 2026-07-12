import React, { useState } from 'react';
import { TextInput, Text, View, TextInputProps, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../theme/colors';

interface InputProps extends TextInputProps {
	label: string;
	error?: string;
	helperText?: string;
	containerStyle?: ViewStyle;
}

export function Input({ label, error, helperText, containerStyle, ...props }: InputProps) {
	const [focused, setFocused] = useState(false);

	return (
		<View style={[styles.wrapper, containerStyle as any]}>
			<Text style={styles.label}>{label}</Text>
			<TextInput
				style={[
					styles.input,
					focused && styles.inputFocused,
					error && styles.inputError,
				]}
				placeholderTextColor={colors.text.tertiary}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				{...props}
			/>
			{error && <Text style={styles.error}>{error}</Text>}
			{helperText && <Text style={styles.helperText}>{helperText}</Text>}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		marginBottom: spacing.lg,
	},

	label: {
		color: colors.text.secondary,
		fontWeight: typography.weights.medium,
		marginBottom: spacing.xs,
		fontSize: typography.sizes.sm,
	},

	input: {
		backgroundColor: colors.neutral.white,
		borderWidth: 1,
		borderColor: colors.neutral[200],
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.md,
		color: colors.text.primary,
		fontSize: typography.sizes.base,
		fontWeight: typography.weights.normal,
		...shadows.sm,
	},

	inputFocused: {
		borderColor: colors.primary.base,
		borderWidth: 1.5,
		backgroundColor: colors.neutral.white,
		...shadows.md,
	},

	inputError: {
		borderColor: colors.error,
		backgroundColor: '#fce8ea',
	},

	error: {
		color: colors.error,
		marginTop: spacing.sm,
		fontSize: typography.sizes.xs,
		fontWeight: typography.weights.medium,
	},

	helperText: {
		color: colors.text.tertiary,
		marginTop: spacing.sm,
		fontSize: typography.sizes.xs,
	},
});
