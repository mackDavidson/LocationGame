// screens/GameMapScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Dimensions } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';

export default function GameMapScreen() {
  const params = useLocalSearchParams();
  console.log("Raw params received:", params);
  
  const targetLocation = {
    latitude: parseFloat(params.latitude || 0),
    longitude: parseFloat(params.longitude || 0),
    name: params.name || 'Unknown Location'
  };
  console.log("Target location initialized:", targetLocation);
  const router = useRouter();
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastDistance, setLastDistance] = useState<number | 0>(0);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sound, setSound] = useState();
  const mapRef = useRef(null);
  
  const warmerSound = require('../assets/sounds/success.wav');
  const colderSound = require('../assets/sounds/fail.wav');
  const victorySound = require('../assets/sounds/woo.m4a');
  
  // Distance calculation function (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c * 1000; // Distance in meters
    return distance;
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Sound effect player
  async function playSound(soundFile) {
    const { sound } = await Audio.Sound.createAsync(soundFile);
    setSound(sound);
    await sound.playAsync();
  }

  useEffect(() => {
    // Clean up sound on unmount
    return sound ? () => sound.unloadAsync() : undefined;
  }, [sound]);

  // Initial location setup
  useEffect(() => {
    (async () => {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log("Location permission status:", status);
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for this game.');
        return;
      }

      // Get current location
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      console.log("Initial location:", location);


      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      // Set up location watcher
      const watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1, // Update every 1 meter
        },
        (location) => {
          console.log("Location update from watcher:", location); 
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        },
        (error) => {
          console.error('Location watch error:', error);
          setIsLoading(false);
        }
      );
      
      setIsLoading(false);
      
      // Clean up location watcher on unmount
      return () => {
        if (watchId) watchId.remove();
      };
    })();
  }, []);

  // Check proximity when user clicks the button
  const checkProximity = () => {
    console.log("Checking proximity...");
    if (!currentLocation) return;

    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      targetLocation.latitude,
      targetLocation.longitude
    );
    
    // Victory condition
    console.log(`Current location: ${currentLocation.latitude}, ${currentLocation.longitude}`)
    if (distance < 10) {
      playSound(victorySound);
      Alert.alert(
        "You found it!",
        "Congratulations! You've reached the target location!",
        [
          { text: "New Game", onPress: () => router.push('./QRScannerScreen') }
        ]
      );
      return;
    }
    
    // Warmer/colder feedback
    if (lastDistance === null) {
      setFeedback("Move around to get closer!");
    } else if (distance < lastDistance) {
      setFeedback("Getting warmer! You're moving closer.");
      console.log(`Distance: ${distance} meters`);
      console.log('Target location: ', targetLocation)
      playSound(warmerSound);
    } else {
      setFeedback("Getting colder! Try another direction.");
      console.log(`Distance: ${distance} meters`);
      console.log('Target location: ', targetLocation)
      playSound(colderSound);
    }
    
    setLastDistance(distance);
  };

  // Center map on the user's current position
  const centerMapOnUser = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading map and location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentLocation && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            ...currentLocation,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          showsUserLocation={true}
          followsUserLocation={true}
        >
          <Circle
            center={currentLocation}
            radius={20}
            fillColor="rgba(0, 150, 255, 0.3)"
            strokeColor="rgba(0, 150, 255, 0.5)"
          />
        </MapView>
      )}

      <View style={styles.feedbackContainer}>
        <Text style={styles.feedbackText}>{feedback}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={checkProximity}>
          <Text style={styles.buttonText}>Am I Close?</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.centerButton]} onPress={centerMapOnUser}>
          <Text style={styles.buttonText}>Center on Me</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 300,
  },
  feedbackContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    marginTop: 5,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    margin: 5,
    alignItems: 'center',
  },
  centerButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});