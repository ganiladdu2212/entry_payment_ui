@echo off
"C:\\Program Files\\Microsoft\\jdk-21.0.12.101-hotspot\\bin\\java" ^
  --class-path ^
  "C:\\Users\\HP\\.gradle\\caches\\modules-2\\files-2.1\\com.google.prefab\\cli\\2.1.0\\aa32fec809c44fa531f01dcfb739b5b3304d3050\\cli-2.1.0-all.jar" ^
  com.google.prefab.cli.AppKt ^
  --build-system ^
  cmake ^
  --platform ^
  android ^
  --abi ^
  arm64-v8a ^
  --os-version ^
  24 ^
  --stl ^
  c++_shared ^
  --ndk-version ^
  27 ^
  --output ^
  "C:\\Users\\HP\\AppData\\Local\\Temp\\agp-prefab-staging10943479032449067219\\staged-cli-output" ^
  "C:\\Ganesh\\Entry_Payment\\entry_payment_ui\\android\\app\\build\\intermediates\\cxx\\refs\\react-native-reanimated\\3d2p6y19" ^
  "C:\\Ganesh\\Entry_Payment\\entry_payment_ui\\android\\app\\build\\intermediates\\cxx\\refs\\react-native-worklets\\15d6x2f4" ^
  "C:\\Users\\HP\\.gradle\\caches\\9.3.1\\transforms\\f8e768d0395983f8046aca9afd27bb43\\workspace\\transformed\\react-android-0.86.0-release\\prefab" ^
  "C:\\Users\\HP\\.gradle\\caches\\9.3.1\\transforms\\3fcbcdbcc8e2d17c2f27c919985f30b6\\workspace\\transformed\\hermes-android-250829098.0.14-release\\prefab" ^
  "C:\\Users\\HP\\.gradle\\caches\\9.3.1\\transforms\\888f2bb0e6671b092c097f30063cdd87\\workspace\\transformed\\fbjni-0.7.0\\prefab"
