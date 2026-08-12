#ifndef LINGUAAI_LLAMA_JNI_H
#define LINGUAAI_LLAMA_JNI_H

#include <jni.h>

#ifdef __cplusplus
extern "C" {
#endif

JNIEXPORT jboolean JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeInitEngine(
        JNIEnv *env,
        jobject thiz);

JNIEXPORT jlong JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeLoadModel(
        JNIEnv *env,
        jobject thiz,
        jstring modelPath);

JNIEXPORT jstring JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeRunInference(
        JNIEnv *env,
        jobject thiz,
        jlong modelPtr,
        jstring prompt,
        jint maxTokens,
        jfloat temperature,
        jfloat topP);

JNIEXPORT void JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeUnloadModel(
        JNIEnv *env,
        jobject thiz,
        jlong modelPtr);

JNIEXPORT void JNICALL
Java_com_linguaai_persian_plugins_LocalAIManager_nativeFreeEngine(
        JNIEnv *env,
        jobject thiz);

#ifdef __cplusplus
}
#endif

#endif
