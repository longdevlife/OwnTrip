import React, { useEffect, useRef } from 'react';
import {
  Alert,
  View,
  Text,
  ImageBackground,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { styles } from './styles/login.styles';
import { authService } from '@/services/authService';

const loginBg = require('@/assets/images/login-bg.png');
const logo = require('@/assets/images/logo.png');

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const loginCalled = useRef(false);
  const isExpoGo = Constants.appOwnership === 'expo';
  const owner = Constants.expoConfig?.owner ?? 'khoale3004';
  const slug = Constants.expoConfig?.slug ?? 'owntrip';
  const projectFullName = `@${owner.replace(/^@/, '')}/${slug}`;
  const redirectUri = isExpoGo
    ? `https://auth.expo.io/${projectFullName}/oauthredirect`
    : AuthSession.makeRedirectUri({
        scheme: 'owntrip',
        path: 'oauthredirect',
      });

  const webClientId = '524802175661-62nri3lt2vkio173e1imnt375qt9kjc5.apps.googleusercontent.com';

  const androidClientId =
    '524802175661-smom6nhj2khdc5lq2ng15ovph3vgj28o.apps.googleusercontent.com';

  const effectiveAndroidClientId = isExpoGo ? webClientId : androidClientId;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId,
    redirectUri,
    webClientId,
    androidClientId: effectiveAndroidClientId,
    iosClientId: webClientId,
  });

  useEffect(() => {
    if (response?.type === 'success' && !loginCalled.current) {
      loginCalled.current = true;

      const idToken = response.params?.id_token ?? response.authentication?.idToken;

      if (idToken) {
        loginWithBackend(idToken);
      } else {
        loginCalled.current = false;
        Alert.alert('Google Login Failed', 'No id token returned from Google.');
      }
    }
  }, [response]);

  const loginWithBackend = async (idToken: string) => {
    try {
      const res: any = await authService.googleLogin(idToken);

      console.log('LOGIN SUCCESS:', res);

      if (res?.token) {
        await AsyncStorage.setItem('token', res.token);
        console.log('TOKEN SAVED');
      }
    } catch (error) {
      console.log('Google login error:', error);
    }
  };

  const handleGoogleLogin = () => {
    promptAsync();
  };

  const handleAppleLogin = () => {
    console.log('Apple Login pressed');
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ImageBackground source={loginBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay} />

        <View style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
            disabled={!request}
          >
            <FontAwesome name="google" size={20} color="#4285F4" />
            <Text style={styles.googleText}>Log in by Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={handleAppleLogin}
            activeOpacity={0.8}
          >
            <FontAwesome name="apple" size={20} color="#FFFFFF" />
            <Text style={styles.appleText}>Log in by Apple</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}
