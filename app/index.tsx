// screens/QRScannerScreen.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, Button, Alert, TouchableOpacity } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

interface BarcodeData {
  type: string;
  data: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cornerPoints: Array<{ x: number; y: number }>;
}

export default function QRScannerScreen() {
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  // const handleBarCodeScanned = ({ type, data }) => {
  //   setScanned(true);
  //   try {
  //     // Parse QR code data (expecting JSON with target coordinates)
  //     const locationData = JSON.parse(data);
      
  //     if (locationData.latitude && locationData.longitude) {
  //       Alert.alert(
  //         "Location Found!",
  //         "Now try to find this hidden spot!",
  //         [
  //           { 
  //             text: "Start Hunt", 
  //             onPress: () => router.push('./GameMapScreen')
  //           }
  //         ]
  //       );
  //     } else {
  //       Alert.alert("Invalid QR Code", "This QR code doesn't contain valid location data.");
  //     }
  //   } catch (error) {
  //     Alert.alert("Error", "Unable to parse QR code data. Please try another code.");
  //   }
  // };
  

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    console.log(`Barcode of type ${type} detected!`);
    console.log(`Barcode data: ${data}`);
    
    try {
      let locationData;
      
      // Check if it's a geo URI (starts with "geo:")
      if (data.startsWith('geo:')) {
        // Parse geo URI format (geo:latitude,longitude)
        const coordinates = data.substring(4).split(',');
        if (coordinates.length >= 2) {
          locationData = {
            latitude: parseFloat(coordinates[0]),
            longitude: parseFloat(coordinates[1]),
            name: "Location from QR Code"
          };
          console.log("Parsed geo URI format:", locationData);
        } else {
          throw new Error("Invalid geo URI format");
        }
      } else {
        // Try to parse as JSON
        locationData = JSON.parse(data);
        console.log("Parsed JSON format:", locationData);
      }
      
      // Validate we have coordinates
      if (locationData && locationData.latitude && locationData.longitude) {
        setTimeout(() => {
          const queryParams = `latitude=${locationData.latitude}&longitude=${locationData.longitude}&name=${encodeURIComponent(locationData.name || 'Location from QR Code')}`;
          router.push(`/gameMap?${queryParams}`);
        }, 100);
      } else {
        Alert.alert("Invalid QR Code", "Missing location coordinates.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while processing the QR code.");
    }
  };

  return (
    <View style={styles.container}>
    <CameraView style={styles.camera} facing={facing} barcodeScannerSettings={{
    barcodeTypes: ["qr"],
    }} 
    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} >
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
          <Text style={styles.text}>Flip Camera</Text>
        </TouchableOpacity>
      </View>
    </CameraView>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
  },
  scanText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  message: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
    margin: 10,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});