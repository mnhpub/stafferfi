//HELLO   JOB (FB3),'HELLO',CLASS=A,MSGCLASS=A
//STEP1   EXEC PGM=GCCMVS,PARM='hello'
//SYSIN   DD  *
#include <iostream>
int main() {
    std::cout << "HELLO FROM MAINFRAME EMULATION OVER TN3270 TLS!" << std::endl;
    return 0;
}
/*
