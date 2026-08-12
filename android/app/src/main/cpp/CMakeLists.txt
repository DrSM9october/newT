cmake_minimum_required(VERSION 3.22)

project("linguaai_localai")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(LLAMA_PATH
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party/llama.cpp
)

# Android / CPU فقط
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TOOLS OFF CACHE BOOL "" FORCE)

set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)

add_subdirectory(
    ${LLAMA_PATH}
    ${CMAKE_CURRENT_BINARY_DIR}/llama
)

find_library(log-lib log)

add_library(
    linguaai_localai
    SHARED
    jni/llama_jni.cpp
)

target_include_directories(
    linguaai_localai
    PRIVATE
    ${LLAMA_PATH}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/jni
)

target_link_libraries(
    linguaai_localai
    llama
    ${log-lib}
)
