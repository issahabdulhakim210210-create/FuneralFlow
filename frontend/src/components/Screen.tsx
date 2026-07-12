import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/colors';

interface ScreenProps {
	children: React.ReactNode;
	scroll?: boolean;
}

export function Screen({ children, scroll = true }: ScreenProps) {
	const content = (
		<View style={styles.content}>
			{children}
		</View>
	);

	return (
		<SafeAreaView style={styles.container} edges={['top', 'bottom']}>
			{scroll ? (
				<ScrollView
					bounces={false}
					contentContainerStyle={{ flexGrow: 1 }}
					showsVerticalScrollIndicator={false}
				>
					{content}
				</ScrollView>
			) : (
				content
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background.secondary,
	},

	content: {
		flex: 1,
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.lg,
		paddingBottom: spacing.xxl,
	},
});
