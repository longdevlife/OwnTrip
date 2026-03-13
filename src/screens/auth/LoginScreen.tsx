import React from 'react';
import { View, Text, ImageBackground, Image, TouchableOpacity, StatusBar } from 'react-native';

import { styles } from './styles/login.styles';

const loginBg = require('@/assets/images/login-bg.png');

const logo = require('@/assets/images/logo.png');

export default function LoginScreen() {
  const handleGoogleLogin = () => {
    console.log('Google Login pressed');
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
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>Log in by Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={handleAppleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.appleIcon}></Text>
            <Text style={styles.appleText}>Log in by Apple</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}
