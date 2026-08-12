cmake_minimum_required(VERSION 3.22)
project("linguaai_localai")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(LLAMA_PATH ${CMAKE_CURRENT_SOURCE_DIR}/third_party/llama.cpp)

# غیرفعال کردن ویژگی‌های اضافی
set(LLAMA_CUBLAS OFF CACHE BOOL "" FORCE)
set(LLAMA_METAL OFF CACHE BOOL "" FORCE)
set(LLAMA_OPENMP OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_NATIVE OFF CACHE BOOL "" FORCE)

add_subdirectory(${LLAMA_PATH} ${CMAKE_CURRENT_BINARY_DIR}/llama)

add_library(liblinguaai_localai SHARED
    jni/llama_jni.cpp
)

target_link_libraries(liblinguaai_localai
    llama
    ggml
    ggml-base
    ${log-lib}
)

target_include_directories(liblinguaai_localai PRIVATE
    ${LLAMA_PATH}
    ${LLAMA_PATH}/common
    ${CMAKE_CURRENT_SOURCE_DIR}/jni
)

target_compile_options(liblinguaai_localai PRIVATE
    -O3
    -DNDEBUG
    -fPIC
    -funroll-loops
    -march=armv8.2-a+fp16+rcpc+dotprod+crypto
)
