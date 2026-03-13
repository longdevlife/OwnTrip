import React from 'react';
import { View, Text, ImageBackground, Image, TouchableOpacity, StatusBar } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

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

        {/* Logo ở giữa trên — to hơn theo mẫu */}
        <View style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Nút đăng nhập ở dưới */}
        <View style={styles.bottomContainer}>
          {/* Nút Google — nền trắng, icon Google màu */}
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
          >
            <FontAwesome name="google" size={20} color="#4285F4" />
            <Text style={styles.googleText}>Log in by Google</Text>
          </TouchableOpacity>

          {/* Nút Apple — nền đen, icon Apple trắng */}
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
