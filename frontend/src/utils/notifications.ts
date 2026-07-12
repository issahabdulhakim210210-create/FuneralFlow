import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

export async function initNotifications() {
  if (isExpoGo) {
    console.warn('Skipping expo-notifications initialization in Expo Go.');
    return;
  }

  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotificationsAsync() {
  if (isExpoGo) {
    console.warn('Skipping push notification registration in Expo Go.');
    return null;
  }

  const Notifications = await import('expo-notifications');
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (error) {
    console.error(error);
    return null;
  }
}
