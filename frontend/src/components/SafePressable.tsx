import React, { useState, ReactNode } from 'react';
import { TouchableOpacity, View, Text, TextProps } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';

// Dynamically require react-native to guard against environments
// where `Pressable` may not be available at runtime.
let NativePressable: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  NativePressable = RN.Pressable || null;
} catch (e) {
  NativePressable = null;
}

const Base = NativePressable || TouchableOpacity;

function isBackText(children: ReactNode) {
  // handle plain string or <Text> '← Back'
  if (typeof children === 'string') return children.trim() === '← Back';
  if (Array.isArray(children)) return children.some(isBackText as any);
  if ((children as any)?.props && (children as any).props.children) {
    const inner = (children as any).props.children;
    if (typeof inner === 'string') return inner.trim() === '← Back';
  }
  return false;
}

export default function SafePressable(props: any) {
  const { style, children, onPressIn, onPressOut, onPress, ...rest } = props;

  // If native Pressable exists, use it directly and pass props through.
  if (NativePressable) {
    // If this is a back button, render with standardized look
    if (isBackText(children)) {
      return (
        <NativePressable onPress={onPress} style={({ pressed }: any) => [{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md }, pressed && { opacity: 0.75 }]} {...rest}>
          <Text style={{ color: colors.primary.base, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold }}>← Back</Text>
        </NativePressable>
      );
    }

    return <NativePressable style={style} onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress} {...rest}>{children ?? <View />}</NativePressable>;
  }

  // Fallback: emulate Pressable's `pressed` state so function styles work.
  const [pressed, setPressed] = useState(false);

  const resolvedStyle = typeof style === 'function' ? style({ pressed }) : style;

  // If children is the old back text, replace with uniform styled text
  if (isBackText(children)) {
    return (
      <TouchableOpacity
        {...rest}
        style={[{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md }, resolvedStyle]}
        onPressIn={(e) => {
          setPressed(true);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          setPressed(false);
          onPressOut?.(e);
        }}
        onPress={onPress}
      >
        <Text style={{ color: colors.primary.base, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold }}>← Back</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      {...rest}
      style={resolvedStyle}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      onPress={onPress}
    >
      {children ?? <View />}
    </TouchableOpacity>
  );
}
