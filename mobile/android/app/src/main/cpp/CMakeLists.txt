cmake_minimum_required(VERSION 3.22.1)

project(memoirllama)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

set(LLAMA_CPP_DIR "${CMAKE_CURRENT_LIST_DIR}/../../../build/generated/llama.cpp")
if (NOT EXISTS "${LLAMA_CPP_DIR}/CMakeLists.txt")
    message(FATAL_ERROR "llama.cpp source is missing at ${LLAMA_CPP_DIR}. Gradle should run prepareMemoirLlamaCppSource before externalNativeBuild.")
endif()

set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_COMMON OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TOOLS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_WEBUI OFF CACHE BOOL "" FORCE)
set(LLAMA_OPENSSL OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_LLAMAFILE OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)

add_subdirectory("${LLAMA_CPP_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/llama.cpp")

add_library(memoirllama SHARED memoirllama.cpp)

target_include_directories(memoirllama PRIVATE "${LLAMA_CPP_DIR}/include")
target_link_libraries(memoirllama llama android log)
