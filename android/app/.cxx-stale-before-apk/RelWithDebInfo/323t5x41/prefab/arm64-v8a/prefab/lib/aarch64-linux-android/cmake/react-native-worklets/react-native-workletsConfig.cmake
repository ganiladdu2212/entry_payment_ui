if(NOT TARGET react-native-worklets::worklets)
add_library(react-native-worklets::worklets SHARED IMPORTED)
set_target_properties(react-native-worklets::worklets PROPERTIES
    IMPORTED_LOCATION "C:/Ganesh/Entry_Payment/entry_payment_ui/node_modules/react-native-worklets/android/build/intermediates/cxx/RelWithDebInfo/t1w1s4r6/obj/arm64-v8a/libworklets.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Ganesh/Entry_Payment/entry_payment_ui/node_modules/react-native-worklets/android/build/prefab-headers/worklets"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

